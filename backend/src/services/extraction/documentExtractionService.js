const fs = require('fs');
const path = require('path');
const { extractPdfText } = require('./pdfExtractionService');
const { extractDocxText } = require('./docxExtractionService');
const { extractImageOcrText } = require('./ocrExtractionService');
const { extractZipArchive } = require('./zipExtractionService');
const { normalizeText } = require('./textNormalizationService');

/**
 * Main Text Extraction Orchestrator
 * Extracts text from single document or delegates ZIP archives
 */
async function extractDocumentText(filePath, originalName, mimeType) {
  if (!fs.existsSync(filePath)) {
    const err = new Error('File not found on server');
    err.statusCode = 404;
    throw err;
  }

  const name = originalName || path.basename(filePath);
  const ext = path.extname(name).toLowerCase();

  let result = null;

  if (ext === '.pdf') {
    result = await extractPdfText(filePath);
  } else if (ext === '.docx' || ext === '.doc') {
    result = await extractDocxText(filePath);
  } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
    result = await extractImageOcrText(filePath);
  } else if (ext === '.txt') {
    const rawText = fs.readFileSync(filePath, 'utf8');
    const cleanedText = normalizeText(rawText);
    result = {
      text: cleanedText,
      textLength: cleanedText.length,
      extractionMethod: 'plain-text',
      requiresOcr: false,
    };
  } else if (ext === '.zip') {
    return await extractZipArchive(filePath, extractDocumentText);
  } else {
    const err = new Error(`Unsupported file type '${ext}'.`);
    err.statusCode = 400;
    throw err;
  }

  return {
    success: true,
    file: {
      originalName: name,
      fileType: ext.substring(1),
    },
    extraction: {
      text: result.text,
      textLength: result.textLength,
      extractionMethod: result.extractionMethod,
      requiresOcr: result.requiresOcr || false,
      pageCount: result.pageCount || 1,
      ocrPages: result.ocrPages || [],
      pages: result.pages || [],
      qualityNotes: result.qualityNotes || null,
    },
  };
}

module.exports = {
  extractDocumentText,
  extractZipArchive,
};
