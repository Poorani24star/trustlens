const express = require('express');
const router = express.Router();
const copiedContentController = require('../controllers/copiedContentController');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * POST /api/copied-content/analyze
 * Access: Faculty, Researcher (Denied for Student and Admin)
 */
router.post(
  '/analyze',
  authenticateUser,
  authorizeRoles('faculty', 'researcher'),
  copiedContentController.analyzeCopiedContent
);

module.exports = router;
