const fs = require('fs');
const mammoth = require('mammoth');
const { normalizeText } = require('./textNormalizationService');

/**
 * Extracts raw text from DOCX/DOC files using Mammoth
 */
async function extractDocxText(filePath) {
  if (!fs.existsSync(filePath)) {
    const err = new Error('DOCX file not found on server');
    err.statusCode = 404;
    throw err;
  }

  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const rawText = result.value || '';
    const cleanedText = normalizeText(rawText);

    return {
      text: cleanedText,
      textLength: cleanedText.length,
      extractionMethod: 'docx-text',
      requiresOcr: false,
    };
  } catch (err) {
    console.error('[DocxExtractionService] DOCX extraction failed:', err.message);
    const error = new Error(`Failed to extract text from DOCX: ${err.message}`);
    error.statusCode = 422;
    throw error;
  }
}

module.exports = {
  extractDocxText,
};
