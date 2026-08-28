const express = require('express');
const router = express.Router();
const knowledgeController = require('../controllers/knowledgeController');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');
const { handleSingleUpload } = require('../middleware/uploadMiddleware');

// All knowledge repository routes require Authentication + Admin Role
router.use(authenticateUser);
router.use(authorizeRoles('admin'));

/**
 * POST /api/knowledge/upload
 * Upload document file to Trusted Knowledge Repository
 */
router.post('/upload', handleSingleUpload('file'), knowledgeController.uploadKnowledgeFile);

/**
 * POST /api/knowledge/text
 * Add direct text or URL reference entry to Trusted Knowledge Repository
 */
router.post('/text', knowledgeController.createKnowledgeText);

/**
 * POST /api/knowledge/seed
 * Seed initial trusted Computer Science knowledge repository
 */
router.post('/seed', knowledgeController.seedSources);

/**
 * GET /api/knowledge
 * List all trusted knowledge repository sources
 */
router.get('/', knowledgeController.listSources);

/**
 * GET /api/knowledge/:id
 * Retrieve specific trusted knowledge source details
 */
router.get('/:id', knowledgeController.getSourceById);

/**
 * PUT /api/knowledge/:id
 * Update an existing trusted knowledge source document
 */
router.put('/:id', knowledgeController.updateSource);

/**
 * PATCH /api/knowledge/:id/status
 * Update status of a trusted knowledge source (active, inactive, archived)
 */
router.patch('/:id/status', knowledgeController.updateSourceStatus);

/**
 * DELETE /api/knowledge/:id
 * Delete a trusted knowledge source
 */
router.delete('/:id', knowledgeController.deleteSource);

module.exports = router;
