const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

// All Admin Management routes require authentication AND admin role authorization
router.use(authenticateUser);
router.use(authorizeRoles('admin'));

/**
 * GET /api/admin/dashboard
 * Retrieve lightweight summary dashboard statistics
 */
router.get('/dashboard', adminController.getDashboard);

/**
 * GET /api/admin/users
 * Paginated user listing with optional filters (role, status, search, limit, cursor)
 */
router.get('/users', adminController.listUsers);

/**
 * GET /api/admin/users/:userId
 * Detailed profile view for a specific user
 */
router.get('/users/:userId', adminController.getUserDetails);

/**
 * PATCH /api/admin/users/:userId/status
 * Update user account status (active or suspended)
 */
router.patch('/users/:userId/status', adminController.updateUserStatus);

/**
 * GET /api/admin/activity
 * Retrieve recent system and administrative activity logs
 */
router.get('/activity', adminController.getActivity);

/**
 * GET /api/admin/profile
 * Retrieve authenticated Admin's profile
 */
router.get('/profile', adminController.getProfile);

/**
 * GET /api/admin/reports
 * Paginated system report listing with optional filters (type, status, search)
 */
router.get('/reports', adminController.listReports);

/**
 * GET /api/admin/reports/:reportId
 * Retrieve full report details for Admin
 */
router.get('/reports/:reportId', adminController.getReportDetails);

/**
 * GET /api/admin/analytics
 * Retrieve system analytics, metrics, distributions, and trends
 */
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
