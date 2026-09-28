const analysisJobService = require('../services/analysisJobService');
const { validateOwnership } = require('../services/uploadRegistryService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');

/**
 * POST /api/analysis/jobs/start
 * Starts an asynchronous analysis background job and returns immediately with jobId
 */
async function startJob(req, res, next) {
  try {
    const { type, uploadId, files = [] } = req.body;

    if (!type || !['copied-content', 'error-detection'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid analysis type. Expected "copied-content" or "error-detection".'
      });
    }

    if (!uploadId) {
      return res.status(400).json({
        success: false,
        message: 'uploadId is required'
      });
    }

    // Validate ownership of upload session
    let sessionFiles = files;
    try {
      const session = validateOwnership(uploadId, req.user.uid);
      if (session && session.files && session.files.length > 0) {
        sessionFiles = session.files;
      }
    } catch (sessionErr) {
      if (!files || files.length === 0) {
        throw sessionErr;
      }
    }

    // Create job instance
    const job = analysisJobService.createJob({
      userId: req.user.uid,
      type,
      uploadId,
      files: sessionFiles
    });

    // Send immediate response so client gets jobId instantly
    res.status(201).json({
      success: true,
      jobId: job.jobId,
      message: 'Analysis job created and queued for execution'
    });

    // Run execution in the background asynchronously
    setImmediate(async () => {
      try {
        analysisJobService.updateProgress(job.jobId, {
          status: 'running',
          stage: 'starting',
          stageTitle: 'Starting Analysis',
          percent: 5,
          message: 'Initializing document processing pipeline…'
        });

        const onProgress = (update) => {
          analysisJobService.updateProgress(job.jobId, update);
        };

        const abortSignal = job.abortController.signal;

        let result = null;

        if (type === 'copied-content') {
          result = await copiedContentService.analyzeCopiedContent(req.user, uploadId, {
            onProgress,
            abortSignal
          });
        } else if (type === 'error-detection') {
          result = await errorDetectionService.analyzeErrorDetectionDocument(req.user, uploadId, {
            onProgress,
            abortSignal
          });
        }

        analysisJobService.completeJob(job.jobId, result);
      } catch (err) {
        if (job.status === 'cancelled' || job.abortController.signal.aborted) {
          console.log(`[AnalysisController] Job ${job.jobId} was cancelled by user.`);
          return;
        }
        console.error(`[AnalysisController] Job ${job.jobId} execution failed:`, err.message);
        analysisJobService.failJob(job.jobId, err);
      }
    });

  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * GET /api/analysis/jobs/:jobId
 * Returns current snapshot of job status and progress
 */
function getJobStatus(req, res, next) {
  try {
    const { jobId } = req.params;
    const summary = analysisJobService.getJobSummary(jobId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Analysis job not found or expired'
      });
    }

    return res.status(200).json({
      success: true,
      job: summary
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analysis/jobs/:jobId/events
 * Streams real-time progress events using Server-Sent Events (SSE)
 */
function streamJobEvents(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = analysisJobService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Analysis job not found'
      });
    }

    // Set headers for SSE text/event-stream
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': req.headers.origin || '*'
    });

    if (res.flushHeaders) {
      res.flushHeaders();
    }

    // Heartbeat ping every 15s to keep connection open through reverse proxies
    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 15000);

    const unsubscribe = analysisJobService.addSubscriber(jobId, res);

    req.on('close', () => {
      clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/analysis/jobs/:jobId/cancel
 * Aborts and cancels an ongoing analysis job
 */
function cancelJob(req, res, next) {
  try {
    const { jobId } = req.params;
    const reason = req.body?.reason || 'Analysis cancelled by user';

    const success = analysisJobService.cancelJob(jobId, reason);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or already completed'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Analysis job cancelled successfully'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/analysis/jobs/:jobId/retry-file
 * Retries a specific failed file or marks it ready for retry
 */
function retryFile(req, res, next) {
  try {
    const { jobId } = req.params;
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'fileId is required'
      });
    }

    const success = analysisJobService.retryFile(jobId, fileId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Job or file not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'File queued for retry'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  startJob,
  getJobStatus,
  streamJobEvents,
  cancelJob,
  retryFile
};
