const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateUser } = require('../middleware/authMiddleware');

// All report routes require authentication
router.use(authenticateUser);

/**
 * GET /api/reports/stats/summary
 * MUST be registered BEFORE /:reportId to prevent route conflict!
 */
router.get('/stats/summary', reportController.getReportStats);

/**
 * GET /api/reports
 * List authenticated user's reports
 */
router.get('/', reportController.listReports);

/**
 * GET /api/reports/:reportId
 * Retrieve specific report details
 */
router.get('/:reportId', reportController.getReportById);

/**
 * DELETE /api/reports/:reportId
 * Delete user's report
 */
router.delete('/:reportId', reportController.deleteReport);

module.exports = router;
