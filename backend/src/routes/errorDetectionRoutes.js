const express = require('express');
const router = express.Router();
const errorDetectionController = require('../controllers/errorDetectionController');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * POST /api/error-detection/analyze
 * Access: Student, Faculty, Researcher (Denied for Admin)
 */
router.post(
  '/analyze',
  authenticateUser,
  authorizeRoles('student', 'faculty', 'researcher'),
  errorDetectionController.analyzeDocument
);

module.exports = router;
