const adminService = require('../services/adminService');
const activityService = require('../services/activityService');

/**
 * GET /api/admin/dashboard
 * Retrieves lightweight dashboard statistics
 */
async function getDashboard(req, res, next) {
  try {
    const dashboard = await adminService.getDashboardStats();
    return res.status(200).json({
      success: true,
      dashboard,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * GET /api/admin/users
 * Returns paginated user accounts with optional role, status, search, limit, and cursor filters
 */
async function listUsers(req, res, next) {
  try {
    const result = await adminService.listUsers(req.query);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * GET /api/admin/users/:userId
 * Returns detailed safe user profile with report metrics
 */
async function getUserDetails(req, res, next) {
  try {
    const user = await adminService.getUserDetails(req.params.userId);
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * PATCH /api/admin/users/:userId/status
 * Updates user account status to 'active' or 'suspended'
 */
async function updateUserStatus(req, res, next) {
  try {
    const { status } = req.body || {};
    const result = await adminService.updateUserStatus(req.user, req.params.userId, status);
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * GET /api/admin/activity
 * Returns recent administrative and system activity logs
 */
async function getActivity(req, res, next) {
  try {
    const limit = req.query.limit || 20;
    const activity = await activityService.getRecentActivities(limit);
    return res.status(200).json({
      success: true,
      activity,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * GET /api/admin/profile
 * Returns authenticated Admin's profile
 */
async function getProfile(req, res, next) {
  try {
    const profile = await adminService.getAdminProfile(req.user);
    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * GET /api/admin/reports
 * Returns list of system reports with optional filters
 */
async function listReports(req, res, next) {
  try {
    const result = await adminService.listSystemReports(req.query);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * GET /api/admin/reports/:reportId
 * Returns full report details for Admin
 */
async function getReportDetails(req, res, next) {
  try {
    const report = await adminService.getReportDetailsAdmin(req.params.reportId);
    return res.status(200).json({
      success: true,
      report,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * GET /api/admin/analytics
 * Returns comprehensive system analytics derived from Firestore collections
 */
async function getAnalytics(req, res, next) {
  try {
    const analyticsService = require('../services/analyticsService');
    const analytics = await analyticsService.getAdminAnalytics(req.query);
    return res.status(200).json({
      success: true,
      analytics,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

module.exports = {
  getDashboard,
  listUsers,
  getUserDetails,
  updateUserStatus,
  getActivity,
  getProfile,
  listReports,
  getReportDetails,
  getAnalytics,
};
