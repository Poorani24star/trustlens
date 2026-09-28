const crypto = require('crypto');
const EventEmitter = require('events');

class AnalysisJobService extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map();
    // Clean up finished jobs after 1 hour
    this.CLEANUP_TIMEOUT_MS = 60 * 60 * 1000;
  }

  /**
   * Create a new analysis background job
   */
  createJob({ userId, type, uploadId, files = [], options = {} }) {
    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const abortController = new AbortController();

    const formattedFiles = files.map((f, idx) => ({
      id: f.id || `file_${idx + 1}`,
      name: f.originalName || f.name || `Document ${idx + 1}`,
      size: f.size || 0,
      status: 'pending', // pending | extracting | ocr | completed | failed | skipped
      error: null,
      progress: 0,
      retryable: true
    }));

    const job = {
      jobId,
      userId,
      type, // 'copied-content' | 'error-detection'
      uploadId,
      status: 'queued', // queued | running | completed | failed | cancelled
      abortController,
      progress: {
        percent: 0,
        stage: 'queued',
        stageTitle: 'Queued for Analysis',
        message: 'Initializing analysis queue…',
        currentStep: 1,
        totalSteps: type === 'copied-content' ? 4 : 4,
        files: formattedFiles,
        pairs: {
          current: 0,
          total: 0,
          currentPair: ''
        }
      },
      result: null,
      error: null,
      subscribers: new Set(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.jobs.set(jobId, job);
    return job;
  }

  /**
   * Retrieve job by ID
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get safe job summary without internal handles
   */
  getJobSummary(jobId) {
    const job = this.getJob(jobId);
    if (!job) return null;

    return {
      jobId: job.jobId,
      userId: job.userId,
      type: job.type,
      uploadId: job.uploadId,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };
  }

  /**
   * Update progress for a job and broadcast to all SSE subscribers
   */
  updateProgress(jobId, updates = {}) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (job.status === 'cancelled' || job.status === 'failed') {
      return; // Do not overwrite cancelled/failed states
    }

    job.status = updates.status || job.status || 'running';
    job.updatedAt = new Date().toISOString();

    if (updates.percent !== undefined) {
      job.progress.percent = Math.max(0, Math.min(100, Math.round(updates.percent)));
    }
    if (updates.stage) job.progress.stage = updates.stage;
    if (updates.stageTitle) job.progress.stageTitle = updates.stageTitle;
    if (updates.message) job.progress.message = updates.message;
    if (updates.currentStep) job.progress.currentStep = updates.currentStep;
    if (updates.totalSteps) job.progress.totalSteps = updates.totalSteps;

    if (updates.pairs) {
      job.progress.pairs = {
        ...job.progress.pairs,
        ...updates.pairs
      };
    }

    if (updates.fileUpdate) {
      const { id, name, status, error, progress } = updates.fileUpdate;
      job.progress.files = job.progress.files.map(f => {
        if ((id && f.id === id) || (name && f.name === name)) {
          return {
            ...f,
            status: status || f.status,
            error: error !== undefined ? error : f.error,
            progress: progress !== undefined ? progress : f.progress
          };
        }
        return f;
      });
    }

    this.broadcast(job, 'progress', this.getJobSummary(jobId));
  }

  /**
   * Mark job as completed
   */
  completeJob(jobId, result) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    job.result = result;
    job.progress.percent = 100;

    const isUnsupported = result && result.supported === false;

    if (isUnsupported) {
      job.progress.stage = 'unsupported';
      job.progress.stageTitle = 'Domain Validation Notice';
      job.progress.message = result.message || 'Document domain is not currently supported for fact-checking.';
    } else {
      job.progress.stage = 'completed';
      job.progress.stageTitle = 'Analysis Complete';
      job.progress.message = 'Analysis complete! Your report is ready.';
    }
    job.updatedAt = new Date().toISOString();

    // Mark remaining files completed or unsupported
    job.progress.files = job.progress.files.map(f => ({
      ...f,
      status: f.status === 'failed' ? 'failed' : (isUnsupported ? 'unsupported' : 'completed'),
      progress: 100
    }));

    const summary = this.getJobSummary(jobId);
    this.broadcast(job, 'complete', summary);
    this.closeSubscribers(job);
    this.scheduleCleanup(jobId);
  }

  /**
   * Mark job as failed
   */
  failJob(jobId, error) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.error = typeof error === 'string' ? error : error?.message || 'Analysis failed';
    job.progress.stage = 'failed';
    job.progress.stageTitle = 'Analysis Failed';
    job.progress.message = job.error;
    job.updatedAt = new Date().toISOString();

    const summary = this.getJobSummary(jobId);
    this.broadcast(job, 'error', summary);
    this.closeSubscribers(job);
    this.scheduleCleanup(jobId);
  }

  /**
   * Cancel an ongoing analysis job
   */
  cancelJob(jobId, reason = 'Analysis cancelled by user') {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'completed' || job.status === 'cancelled') {
      return true;
    }

    job.status = 'cancelled';
    job.error = reason;
    job.progress.stage = 'cancelled';
    job.progress.stageTitle = 'Analysis Cancelled';
    job.progress.message = reason;
    job.updatedAt = new Date().toISOString();

    // Trigger abort signal for running async loops
    try {
      job.abortController.abort(new Error(reason));
    } catch {
      // ignore abort error
    }

    const summary = this.getJobSummary(jobId);
    this.broadcast(job, 'cancelled', summary);
    this.closeSubscribers(job);
    this.scheduleCleanup(jobId);
    return true;
  }

  /**
   * Retry a specific failed file or continue without it
   */
  retryFile(jobId, fileId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    const file = job.progress.files.find(f => f.id === fileId);
    if (!file) return false;

    file.status = 'pending';
    file.error = null;
    file.progress = 0;

    this.updateProgress(jobId, {
      message: `Retrying processing for ${file.name}…`
    });

    return true;
  }

  /**
   * Register an SSE response stream to receive live updates for a job
   */
  addSubscriber(jobId, res) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.subscribers.add(res);

    // Send immediate snapshot of current state
    const summary = this.getJobSummary(jobId);
    res.write(`event: initial\ndata: ${JSON.stringify(summary)}\n\n`);

    const unsubscribe = () => {
      job.subscribers.delete(res);
    };

    return unsubscribe;
  }

  /**
   * Broadcast SSE payload to all connected subscribers
   */
  broadcast(job, eventName, data) {
    if (!job || !job.subscribers) return;

    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of job.subscribers) {
      try {
        res.write(payload);
      } catch (err) {
        job.subscribers.delete(res);
      }
    }
  }

  /**
   * Close all SSE subscriber streams for a completed/cancelled/failed job
   */
  closeSubscribers(job) {
    if (!job || !job.subscribers) return;

    for (const res of job.subscribers) {
      try {
        res.end();
      } catch {
        // ignore
      }
    }
    job.subscribers.clear();
  }

  /**
   * Schedule job memory cleanup
   */
  scheduleCleanup(jobId) {
    setTimeout(() => {
      this.jobs.delete(jobId);
    }, this.CLEANUP_TIMEOUT_MS).unref();
  }
}

// Singleton instance
const analysisJobService = new AnalysisJobService();
module.exports = analysisJobService;
