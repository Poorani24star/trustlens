const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { handleSingleUpload, handleMultipleUpload } = require('../middleware/uploadMiddleware');
const { authenticateUser } = require('../middleware/authMiddleware');

/**
 * POST /api/documents/upload/single
 * Upload single document for Error Detection
 */
router.post('/upload/single', authenticateUser, handleSingleUpload('file'), documentController.uploadSingle);

/**
 * POST /api/documents/upload/multiple
 * Upload multiple documents for Copied Content Detection (up to 10 files)
 */
router.post('/upload/multiple', authenticateUser, handleMultipleUpload('files', 10), documentController.uploadMultiple);

/**
 * POST /api/documents/upload/zip
 * Upload ZIP archive containing multiple documents for Copied Content Detection
 */
router.post('/upload/zip', authenticateUser, handleSingleUpload('zipFile'), documentController.uploadMultiple);

module.exports = router;
