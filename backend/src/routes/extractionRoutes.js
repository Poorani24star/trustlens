const express = require('express');
const router = express.Router();
const extractionController = require('../controllers/extractionController');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * POST /api/extraction/error-detection
 * Extract text for Error Detection module
 * Access: Student, Faculty, Researcher
 */
router.post(
  '/error-detection',
  authenticateUser,
  authorizeRoles('student', 'faculty', 'researcher'),
  extractionController.extractErrorDetection
);

/**
 * POST /api/extraction/copied-content
 * Extract text for Copied Content module (Multiple files or ZIP)
 * Access: Faculty, Researcher (Denied for Student and Admin)
 */
router.post(
  '/copied-content',
  authenticateUser,
  authorizeRoles('faculty', 'researcher'),
  extractionController.extractCopiedContent
);

module.exports = router;
