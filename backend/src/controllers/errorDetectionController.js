const errorDetectionService = require('../services/errorDetection/errorDetectionService');

/**
 * POST /api/error-detection/analyze
 * Analyzes uploaded document statements against active trusted knowledge sources
 */
async function analyzeDocument(req, res, next) {
  try {
    const { temporaryUploadId } = req.body;

    if (!temporaryUploadId) {
      return res.status(400).json({
        success: false,
        message: 'temporaryUploadId is required'
      });
    }

    const result = await errorDetectionService.analyzeErrorDetectionDocument(req.user, temporaryUploadId);
    return res.status(200).json(result);
  } catch (err) {
    try {
      const { logActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } = require('../services/activityService');
      await logActivity({
        action: ACTIVITY_ACTIONS.REPORT_ANALYSIS_FAILED,
        category: ACTIVITY_CATEGORIES.REPORT,
        message: `Error Detection report analysis failed: ${err.message}`,
        actorId: req.user ? req.user.uid : 'system',
        user: req.user ? (req.user.name || req.user.email) : 'User',
        userName: req.user ? (req.user.name || req.user.email) : 'User',
        role: req.user ? req.user.role : 'student',
        status: 'failed',
        metadata: { error: err.message, reportType: 'error-detection' },
      });
    } catch (logErr) {
      console.error('[ErrorDetectionController] Activity log failed:', logErr.message);
    }

    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

module.exports = {
  analyzeDocument,
};
