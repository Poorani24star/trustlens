const fs = require('fs');
const { createWorker } = require('tesseract.js');
const { normalizeText } = require('./textNormalizationService');

/**
 * Validates whether a buffer or Uint8Array has a valid image signature (PNG, JPEG, BMP, TIFF, WebP)
 * @param {Buffer|Uint8Array} buffer 
 * @returns {boolean}
 */
function isValidImageBuffer(buffer) {
  if (!buffer) return false;
  try {
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    if (buf.length < 8) return false;
    // PNG: 89 50 4E 47 (137, 80, 78, 71)
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
    // BMP: 42 4D
    if (buf[0] === 0x42 && buf[1] === 0x4d) return true;
    // TIFF: 49 49 2A 00 or 4D 4D 00 2A
    if ((buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00) ||
        (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a)) return true;
    // WebP: RIFF ... WEBP
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Cleans raw OCR output to remove typical optical scanning artifacts without fabricating text
 * @param {string} rawText 
 * @returns {string} Cleaned OCR text
 */
function cleanOcrText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  return rawText
    // Remove isolated stray non-alphanumeric OCR glyphs and symbols
    .replace(/[|~¬`^•·_\\@#$%&*+=<>{}\[\]]+/g, ' ')
    // De-hyphenate line-broken words (e.g. communi-\ncation -> communication)
    .replace(/([a-zA-Z]{2,})[-–—]\r?\n\s*([a-zA-Z]{2,})/g, '$1$2')
    // Normalize excessive whitespace while preserving line structure
    .replace(/[ \t]+/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Creates and initializes a Tesseract worker
 */
async function createOcrWorker() {
  try {
    const worker = await createWorker('eng');
    return worker;
  } catch (err) {
    console.error('[OcrExtractionService] Failed to create Tesseract worker:', err.message);
    throw err;
  }
}

/**
 * Extracts text from an image buffer using Tesseract.js OCR
 * @param {Buffer|Uint8Array} imageBuffer 
 * @param {Object} [existingWorker] Optional initialized worker
 * @returns {Promise<{text: string, rawText: string, textLength: number, confidence: number, extractionMethod: string}>}
 */
async function extractBufferOcrText(imageBuffer, existingWorker = null) {
  if (!isValidImageBuffer(imageBuffer)) {
    return {
      text: '',
      rawText: '',
      textLength: 0,
      confidence: 0,
      extractionMethod: 'ocr',
    };
  }

  const safeBuffer = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);
  let localWorker = null;
  const worker = existingWorker || (localWorker = await createOcrWorker());

  try {
    const ret = await worker.recognize(safeBuffer);
    const raw = ret.data.text || '';
    const cleaned = cleanOcrText(raw);

    return {
      text: cleaned,
      rawText: raw,
      textLength: cleaned.length,
      confidence: Math.round(ret.data.confidence || 0),
      extractionMethod: 'ocr',
    };
  } catch (err) {
    console.error('[OcrExtractionService] Buffer OCR recognition failed:', err.message);
    return {
      text: '',
      rawText: '',
      textLength: 0,
      confidence: 0,
      extractionMethod: 'ocr',
      error: err.message,
    };
  } finally {
    if (localWorker) {
      await localWorker.terminate().catch(() => {});
    }
  }
}

/**
 * Extracts text from image files (.jpg, .jpeg, .png) using Tesseract.js OCR
 */
async function extractImageOcrText(filePath) {
  if (!fs.existsSync(filePath)) {
    const err = new Error('Image file not found on server');
    err.statusCode = 404;
    throw err;
  }

  const imageBuffer = fs.readFileSync(filePath);
  if (!imageBuffer || imageBuffer.length === 0) {
    return {
      text: '',
      textLength: 0,
      extractionMethod: 'ocr',
      confidence: 0,
      requiresOcr: true,
      pageCount: 1,
      pages: [],
      message: 'Image file is empty.',
    };
  }

  if (!isValidImageBuffer(imageBuffer)) {
    const err = new Error('Invalid image file format. Supported formats: JPG, JPEG, PNG.');
    err.statusCode = 422;
    throw err;
  }

  const res = await extractBufferOcrText(imageBuffer);
  const normalized = normalizeText(res.text);

  return {
    text: normalized,
    textLength: normalized.length,
    extractionMethod: 'ocr',
    confidence: res.confidence,
    requiresOcr: true,
    pageCount: 1,
    pages: [{
      pageNumber: 1,
      method: 'ocr',
      text: normalized,
      textLength: normalized.length,
      confidence: res.confidence,
      wordCount: normalized.split(/\s+/).filter(Boolean).length,
    }],
    qualityNotes: normalized.length === 0
      ? 'No readable text could be recognized from this image. Please upload a clearer document.'
      : null,
  };
}

module.exports = {
  isValidImageBuffer,
  cleanOcrText,
  createOcrWorker,
  extractBufferOcrText,
  extractImageOcrText,
};
