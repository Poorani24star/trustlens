const knowledgeService = require('../services/knowledgeService');

/**
 * POST /api/knowledge/upload
 * Admin uploads a document file to add to the Trusted Knowledge Repository
 */
async function uploadKnowledgeFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload a PDF, DOCX, TXT, or Image file.'
      });
    }

    const adminUid = req.user ? req.user.uid : 'admin';
    const { title, category, topics, sourceType, sourceOrganization, description, sourceUrl, status } = req.body;

    // Support JSON string topics if sent via multipart/form-data
    let parsedTopics = topics;
    if (typeof topics === 'string') {
      try { parsedTopics = JSON.parse(topics); } catch (_) { parsedTopics = [topics]; }
    }

    const source = await knowledgeService.createFileKnowledgeSource(adminUid, req.file, {
      title,
      category,
      topics: parsedTopics,
      sourceType,
      sourceOrganization,
      description,
      sourceUrl,
      status,
    });

    return res.status(201).json({
      success: true,
      message: 'Knowledge source uploaded and processed successfully',
      source,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * POST /api/knowledge/text
 * Admin adds direct text content or URL metadata to the Trusted Knowledge Repository
 */
async function createKnowledgeText(req, res, next) {
  try {
    const adminUid = req.user ? req.user.uid : 'admin';
    const { title, category, topics, sourceType, sourceOrganization, description, sourceUrl, text, status } = req.body;

    const source = await knowledgeService.createTextKnowledgeSource(adminUid, {
      title,
      category,
      topics,
      sourceType,
      sourceOrganization,
      description,
      sourceUrl,
      text,
      status,
    });

    return res.status(201).json({
      success: true,
      message: 'Knowledge source created successfully',
      source,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * PUT /api/knowledge/:id
 * Admin updates an existing Knowledge Source
 */
async function updateSource(req, res, next) {
  try {
    const { id } = req.params;
    const adminUid = req.user ? req.user.uid : 'admin';

    const source = await knowledgeService.updateKnowledgeSource(id, adminUid, req.body);

    return res.status(200).json({
      success: true,
      message: 'Knowledge source updated successfully',
      source,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * GET /api/knowledge
 * Lists trusted knowledge sources with optional status and category/topic filtering
 */
async function listSources(req, res, next) {
  try {
    const { status, category, topic } = req.query;
    const sources = await knowledgeService.listKnowledgeSources({ status, category, topic });

    return res.status(200).json({
      success: true,
      count: sources.length,
      sources,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/knowledge/:id
 * Retrieves detailed knowledge source document by ID
 */
async function getSourceById(req, res, next) {
  try {
    const { id } = req.params;
    const source = await knowledgeService.getKnowledgeSourceById(id);

    if (!source || source.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Knowledge source not found'
      });
    }

    return res.status(200).json({
      success: true,
      source,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/knowledge/:id/status
 * Updates status of a knowledge source (e.g. active, inactive, archived)
 */
async function updateSourceStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status parameter is required'
      });
    }

    const source = await knowledgeService.updateKnowledgeSourceStatus(id, status);

    return res.status(200).json({
      success: true,
      message: `Knowledge source status updated to ${status}`,
      source,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * DELETE /api/knowledge/:id
 * Soft deletes a knowledge source entry
 */
async function deleteSource(req, res, next) {
  try {
    const { id } = req.params;
    const result = await knowledgeService.deleteKnowledgeSource(id);

    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * POST /api/knowledge/seed
 * Admin triggers seeding of initial trusted Computer Science knowledge repository
 */
async function seedSources(req, res, next) {
  try {
    const { seedTrustedKnowledge } = require('../seeds/seedTrustedKnowledge');
    const result = await seedTrustedKnowledge();

    return res.status(200).json({
      success: true,
      message: 'Trusted Computer Science knowledge base seeded successfully',
      result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadKnowledgeFile,
  createKnowledgeText,
  updateSource,
  seedSources,
  listSources,
  getSourceById,
  updateSourceStatus,
  deleteSource,
};
