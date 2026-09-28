const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const { authenticateUser, optionalAuth } = require('../middleware/authMiddleware');

/**
 * POST /api/analysis/jobs/start
 * Starts a new background analysis job
 */
router.post('/jobs/start', authenticateUser, analysisController.startJob);

/**
 * GET /api/analysis/jobs/:jobId
 * Retrieves current job progress snapshot
 */
router.get('/jobs/:jobId', optionalAuth, analysisController.getJobStatus);

/**
 * GET /api/analysis/jobs/:jobId/events
 * Streams real-time SSE progress events
 */
router.get('/jobs/:jobId/events', optionalAuth, analysisController.streamJobEvents);

/**
 * POST /api/analysis/jobs/:jobId/cancel
 * Aborts an active analysis job
 */
router.post('/jobs/:jobId/cancel', authenticateUser, analysisController.cancelJob);

/**
 * POST /api/analysis/jobs/:jobId/retry-file
 * Retries a failed document in an active job
 */
router.post('/jobs/:jobId/retry-file', authenticateUser, analysisController.retryFile);

module.exports = router;
