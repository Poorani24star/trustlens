const fs = require('fs');
const { normalizeText } = require('./textNormalizationService');
const { extractBufferOcrText, createOcrWorker, cleanOcrText } = require('./ocrExtractionService');

// Lazy-loaded to avoid blocking startup; pdfjs-dist is ESM-only in v5
let _pdfjsLib = null;
async function getPdfjsLib() {
  if (!_pdfjsLib) {
    _pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return _pdfjsLib;
}

/**
 * Checks whether extracted text for a page has sufficient meaningful words to avoid OCR
 * @param {string} text
 * @returns {boolean}
 */
function isTextSufficientForClaimExtraction(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < 25) return false;

  const cleaned = trimmed
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
    .replace(/^Page\s+\d+(\s+of\s+\d+)?$/gmi, '')
    .replace(/^\s*\d+\s*$/gm, '')
    .trim();

  const words = cleaned.split(/\s+/).filter(w => /[a-zA-Z]{2,}/.test(w));
  return words.length >= 6;
}

/**
 * Renders a single PDF page to a PNG Buffer using pdfjs-dist + @napi-rs/canvas
 * @param {Object} pdfDoc  - loaded pdfjs document
 * @param {number} pageNum - 1-based page number
 * @param {number} [scale=2.0]
 * @returns {Promise<Buffer|null>}
 */
async function renderPageToImageBuffer(pdfDoc, pageNum, scale = 2.0) {
  try {
    const { createCanvas } = require('@napi-rs/canvas');
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const width = Math.round(viewport.width);
    const height = Math.round(viewport.height);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const pngBuffer = canvas.toBuffer('image/png');
    page.cleanup();
    return pngBuffer;
  } catch (err) {
    console.warn(`[PdfExtractionService] Page ${pageNum} render failed:`, err.message);
    return null;
  }
}

/**
 * Extracts text from PDF files using digital text extraction with OCR fallback for scanned pages.
 * Uses pdfjs-dist v5 (ESM) + @napi-rs/canvas for page rendering.
 * @param {string} filePath - Absolute path to PDF file
 * @param {Object} [options]
 * @returns {Promise<Object>} Extraction result
 */
async function extractPdfText(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    const err = new Error('PDF file not found on server');
    err.statusCode = 404;
    throw err;
  }

  const dataBuffer = fs.readFileSync(filePath);
  if (!dataBuffer || dataBuffer.length === 0) {
    return {
      text: '',
      textLength: 0,
      extractionMethod: 'normal',
      pageCount: 0,
      pages: [],
      requiresOcr: false,
      message: 'PDF file is empty.',
    };
  }

  // Validate PDF header
  const headerCheck = dataBuffer.slice(0, 10).toString();
  if (!headerCheck.includes('%PDF-')) {
    const err = new Error('Invalid PDF structure: File does not contain a valid PDF header.');
    err.statusCode = 422;
    throw err;
  }

  const pdfjsLib = await getPdfjsLib();
  let pdfDoc = null;
  let ocrWorker = null;

  try {
    const uint8 = new Uint8Array(dataBuffer);

    try {
      const loadTask = pdfjsLib.getDocument({
        data: uint8,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      pdfDoc = await loadTask.promise;
    } catch (loadErr) {
      const msg = loadErr.message || '';
      if (msg.toLowerCase().includes('password')) {
        const err = new Error('This PDF is password-protected and cannot be processed.');
        err.statusCode = 422;
        throw err;
      }
      const err = new Error(`Failed to parse PDF: ${loadErr.message}`);
      err.statusCode = 422;
      throw err;
    }

    const totalPages = pdfDoc.numPages;
    const pageResults = [];
    let ocrUsedCount = 0;
    let normalUsedCount = 0;
    const ocrPagesList = [];

    for (let p = 1; p <= totalPages; p++) {
      if (options.abortSignal?.aborted) {
        throw new Error('Analysis cancelled by user');
      }

      // Step 1: Try digital text extraction via pdfjs
      let digitalText = '';
      try {
        const page = await pdfDoc.getPage(p);
        const textContent = await page.getTextContent();
        digitalText = textContent.items
          .map(item => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        page.cleanup();
      } catch (textErr) {
        console.warn(`[PdfExtractionService] Digital text extraction failed page ${p}:`, textErr.message);
      }

      const isDigitalSufficient = isTextSufficientForClaimExtraction(digitalText);

      if (isDigitalSufficient) {
        normalUsedCount++;
        const cleanedDigital = normalizeText(digitalText);
        pageResults.push({
          pageNumber: p,
          method: 'normal',
          text: cleanedDigital,
          textLength: cleanedDigital.length,
          wordCount: cleanedDigital.split(/\s+/).filter(Boolean).length,
        });

        if (options.onProgress) {
          options.onProgress(Math.round((p / totalPages) * 100), `Extracting page ${p} of ${totalPages}`);
        }
        continue;
      }

      // Step 2: Page has insufficient digital text — render to image and OCR
      ocrPagesList.push(p);

      if (options.onProgress) {
        options.onProgress(
          Math.round((p / totalPages) * 100),
          `OCR processing page ${p} of ${totalPages}…`
        );
      }

      try {
        if (!ocrWorker) {
          ocrWorker = await createOcrWorker();
        }

        const pageImageBuffer = await renderPageToImageBuffer(pdfDoc, p, 2.0);

        if (pageImageBuffer) {
          const ocrRes = await extractBufferOcrText(pageImageBuffer, ocrWorker);
          const cleanedOcr = cleanOcrText(ocrRes.text);

          if (cleanedOcr && cleanedOcr.length > 0) {
            ocrUsedCount++;
            pageResults.push({
              pageNumber: p,
              method: 'ocr',
              text: cleanedOcr,
              textLength: cleanedOcr.length,
              confidence: ocrRes.confidence || 0,
              wordCount: cleanedOcr.split(/\s+/).filter(Boolean).length,
            });
          } else {
            pageResults.push({
              pageNumber: p,
              method: 'ocr_unreadable',
              text: '',
              textLength: 0,
              confidence: 0,
              wordCount: 0,
              warning: `Page ${p} could not be recognized reliably via OCR.`,
            });
          }
        } else {
          // Render failed — fall back to whatever digital text we have
          const fallbackText = digitalText ? normalizeText(digitalText) : '';
          pageResults.push({
            pageNumber: p,
            method: 'unreadable',
            text: fallbackText,
            textLength: fallbackText.length,
            wordCount: fallbackText.split(/\s+/).filter(Boolean).length,
          });
        }
      } catch (pageOcrErr) {
        console.error(`[PdfExtractionService] OCR failed on page ${p}:`, pageOcrErr.message);
        pageResults.push({
          pageNumber: p,
          method: 'failed',
          text: digitalText ? normalizeText(digitalText) : '',
          textLength: 0,
          wordCount: 0,
          error: pageOcrErr.message,
        });
      }
    }

    // Determine overall extraction method
    let finalExtractionMethod = 'normal';
    if (ocrUsedCount > 0 && normalUsedCount > 0) {
      finalExtractionMethod = 'mixed';
    } else if (ocrUsedCount > 0) {
      finalExtractionMethod = 'ocr';
    }

    // Combine page texts in correct page order
    const combinedText = pageResults
      .map(pr => pr.text)
      .filter(Boolean)
      .join('\n\n');

    const normalizedFullText = normalizeText(combinedText);

    return {
      text: normalizedFullText,
      textLength: normalizedFullText.length,
      extractionMethod: finalExtractionMethod,
      pageCount: totalPages,
      ocrPages: ocrPagesList,
      pages: pageResults,
      requiresOcr: finalExtractionMethod !== 'normal',
      qualityNotes: pageResults.filter(pr => pr.method === 'ocr_unreadable').length > 0
        ? 'Some pages could not be read reliably. Please upload a clearer document if necessary.'
        : null,
    };

  } catch (err) {
    if (err.statusCode) throw err;
    console.error('[PdfExtractionService] PDF extraction failed:', err.message);
    const error = new Error(`Failed to extract text from PDF: ${err.message}`);
    error.statusCode = 422;
    throw error;
  } finally {
    if (pdfDoc) {
      try { pdfDoc.destroy(); } catch (_) {}
    }
    if (ocrWorker) {
      await ocrWorker.terminate().catch(() => {});
    }
  }
}

module.exports = {
  isTextSufficientForClaimExtraction,
  extractPdfText,
};
