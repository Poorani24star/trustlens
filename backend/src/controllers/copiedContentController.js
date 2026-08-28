const copiedContentService = require('../services/copiedContent/copiedContentService');

/**
 * POST /api/copied-content/analyze
 * Analyzes uploaded documents for copied or near-identical content
 */
async function analyzeCopiedContent(req, res, next) {
  try {
    const { temporaryUploadId } = req.body;

    if (!temporaryUploadId) {
      return res.status(400).json({
        success: false,
        message: 'temporaryUploadId is required'
      });
    }

    const result = await copiedContentService.analyzeCopiedContent(req.user, temporaryUploadId);
    return res.status(200).json(result);
  } catch (err) {
    try {
      const { logActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } = require('../services/activityService');
      await logActivity({
        action: ACTIVITY_ACTIONS.REPORT_ANALYSIS_FAILED,
        category: ACTIVITY_CATEGORIES.REPORT,
        message: `Copied Content report analysis failed: ${err.message}`,
        actorId: req.user ? req.user.uid : 'system',
        user: req.user ? (req.user.name || req.user.email) : 'User',
        userName: req.user ? (req.user.name || req.user.email) : 'User',
        role: req.user ? req.user.role : 'student',
        status: 'failed',
        metadata: { error: err.message, reportType: 'copied-content' },
      });
    } catch (logErr) {
      console.error('[CopiedContentController] Activity log failed:', logErr.message);
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
  analyzeCopiedContent,
};
