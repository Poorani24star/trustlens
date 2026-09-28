import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  startAnalysisJob, 
  getJobStatus, 
  cancelAnalysisJob, 
  retryAnalysisFile, 
  createAnalysisEventSource 
} from '../services/analysisService';

const INITIAL_PROGRESS = {
  percent: 0,
  stage: 'queued',
  stageTitle: 'Initializing Analysis',
  message: 'Preparing document pipeline…',
  currentStep: 1,
  totalSteps: 4,
  files: [],
  pairs: {
    current: 0,
    total: 0,
    currentPair: ''
  }
};

export function useAnalysisProgress({ onComplete, onError, onCancel } = {}) {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | queued | running | completed | failed | cancelled
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const eventSourceRef = useRef(null);
  const pollingTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const isCancellingRef = useRef(false);

  // Clean up SSE and timers on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, []);

  const handleJobUpdate = useCallback((jobData) => {
    if (!jobData || !isMountedRef.current) return;

    if (jobData.status) {
      setStatus(jobData.status);
    }
    if (jobData.progress) {
      setProgress(prev => ({
        ...prev,
        ...jobData.progress,
        pairs: {
          ...prev.pairs,
          ...(jobData.progress.pairs || {})
        },
        files: jobData.progress.files || prev.files
      }));
    }
    if (jobData.result) {
      setResult(jobData.result);
    }
    if (jobData.error) {
      setError(jobData.error);
    }

    if (jobData.status === 'completed') {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (onComplete) onComplete(jobData.result);
    } else if (jobData.status === 'failed') {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (onError) onError(jobData.error || 'Analysis failed');
    } else if (jobData.status === 'cancelled') {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (!isCancellingRef.current && onCancel) onCancel();
      isCancellingRef.current = false;
    }
  }, [onComplete, onError, onCancel]);

  /**
   * Start a new analysis job and initiate real-time SSE listener with polling backup
   */
  const startJob = useCallback(async ({ type, uploadId, files = [] }) => {
    setError(null);
    setResult(null);
    setStatus('queued');
    setProgress({
      ...INITIAL_PROGRESS,
      files: files.map((f, i) => ({
        id: `file_${i + 1}`,
        name: f.originalName || f.name || `Document ${i + 1}`,
        status: 'pending',
        progress: 0,
        error: null
      }))
    });

    try {
      const res = await startAnalysisJob({ type, uploadId, files });
      const newJobId = res.jobId;
      setJobId(newJobId);
      setStatus('running');

      // Establish Server-Sent Events stream
      if (typeof window !== 'undefined' && window.EventSource) {
        try {
          const es = createAnalysisEventSource(newJobId);
          eventSourceRef.current = es;

          es.addEventListener('initial', (e) => {
            try { handleJobUpdate(JSON.parse(e.data)); } catch {}
          });

          es.addEventListener('progress', (e) => {
            try { handleJobUpdate(JSON.parse(e.data)); } catch {}
          });

          es.addEventListener('complete', (e) => {
            try { handleJobUpdate(JSON.parse(e.data)); } catch {}
          });

          es.addEventListener('cancelled', (e) => {
            try { handleJobUpdate(JSON.parse(e.data)); } catch {}
          });

          es.addEventListener('error', (e) => {
            // If SSE connection encounters network issue, fallback to polling
            if (es.readyState === EventSource.CLOSED) {
              startPollingFallback(newJobId);
            }
          });
        } catch {
          startPollingFallback(newJobId);
        }
      } else {
        startPollingFallback(newJobId);
      }

      return newJobId;
    } catch (err) {
      setStatus('failed');
      setError(err.message || 'Failed to start analysis job');
      if (onError) onError(err.message);
      throw err;
    }
  }, [handleJobUpdate, onError]);

  /**
   * Fallback polling if SSE is unsupported or temporarily disconnected
   */
  const startPollingFallback = useCallback((targetJobId) => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);

    pollingTimerRef.current = setInterval(async () => {
      try {
        const res = await getJobStatus(targetJobId);
        if (res && res.success && res.job) {
          handleJobUpdate(res.job);
        }
      } catch (err) {
        console.warn('[useAnalysisProgress] Polling notice:', err.message);
      }
    }, 1200);
  }, [handleJobUpdate]);

  /**
   * Cancel the running analysis job
   */
  const cancelJob = useCallback(async (reason = 'Analysis cancelled by user') => {
    if (!jobId) return;
    isCancellingRef.current = true;
    try {
      await cancelAnalysisJob(jobId, reason);
    } catch (err) {
      console.error('[useAnalysisProgress] Cancel API call failed:', err.message);
    }
    // Always apply cancelled state regardless of API success
    if (eventSourceRef.current) eventSourceRef.current.close();
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    setStatus('cancelled');
    setProgress(prev => ({
      ...prev,
      stage: 'cancelled',
      stageTitle: 'Analysis Cancelled',
      message: reason
    }));
    isCancellingRef.current = false;
    if (onCancel) onCancel();
  }, [jobId, onCancel]);

  /**
   * Retry an individual failed file
   */
  const retryFile = useCallback(async (fileId) => {
    if (!jobId || !fileId) return;
    try {
      await retryAnalysisFile(jobId, fileId);
      setProgress(prev => ({
        ...prev,
        files: prev.files.map(f => f.id === fileId ? { ...f, status: 'pending', error: null } : f)
      }));
    } catch (err) {
      console.error('[useAnalysisProgress] Retry file failed:', err.message);
    }
  }, [jobId]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    setJobId(null);
    setStatus('idle');
    setProgress(INITIAL_PROGRESS);
    setResult(null);
    setError(null);
  }, []);

  return {
    jobId,
    status,
    progress,
    result,
    error,
    isRunning: status === 'running' || status === 'queued',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
    isCancelled: status === 'cancelled',
    startJob,
    cancelJob,
    retryFile,
    reset
  };
}
