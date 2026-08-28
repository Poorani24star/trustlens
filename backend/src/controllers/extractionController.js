const path = require('path');
const { validateOwnership } = require('../services/uploadRegistryService');
const { extractDocumentText } = require('../services/extraction/documentExtractionService');

/**
 * POST /api/extraction/error-detection
 * Extracts text from single uploaded document for Error Detection module
 */
async function extractErrorDetection(req, res, next) {
  try {
    const uploadId = req.body.uploadId || req.body.temporaryUploadId;
    const session = validateOwnership(uploadId, req.user.uid);

    if (!session.files || session.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files found in upload session'
      });
    }

    if (session.files.length === 1) {
      const file = session.files[0];
      const result = await extractDocumentText(file.uploadPath, file.originalName, file.mimeType);
      return res.status(200).json(result);
    }

    // Support multi-document extraction for error detection
    const extractedDocs = [];
    for (const file of session.files) {
      const docResult = await extractDocumentText(file.uploadPath, file.originalName, file.mimeType);
      extractedDocs.push({
        originalName: file.originalName,
        mimeType: file.mimeType,
        extraction: docResult.extraction,
      });
    }

    return res.status(200).json({
      success: true,
      extractionMethod: 'multiple-documents-error-detection',
      documents: extractedDocs,
      documentCount: extractedDocs.length,
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
 * POST /api/extraction/copied-content
 * Extracts text from multiple uploaded documents or ZIP for Copied Content Detection module
 */
async function extractCopiedContent(req, res, next) {
  try {
    const uploadId = req.body.uploadId || req.body.temporaryUploadId;
    const session = validateOwnership(uploadId, req.user.uid);

    if (!session.files || session.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files found in upload session'
      });
    }

    // Check if single ZIP file
    if (session.files.length === 1 && session.files[0].originalName.toLowerCase().endsWith('.zip')) {
      const file = session.files[0];
      const zipResult = await extractDocumentText(file.uploadPath, file.originalName, file.mimeType);
      return res.status(200).json(zipResult);
    }

    // Handle multiple document files
    const extractedDocs = [];
    for (const file of session.files) {
      const docResult = await extractDocumentText(file.uploadPath, file.originalName, file.mimeType);
      extractedDocs.push({
        originalName: file.originalName,
        fileType: path.extname(file.originalName).substring(1).toLowerCase(),
        extraction: docResult.extraction,
      });
    }

    return res.status(200).json({
      success: true,
      extractionMethod: 'multiple-documents',
      documents: extractedDocs,
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

module.exports = {
  extractErrorDetection,
  extractCopiedContent,
};
