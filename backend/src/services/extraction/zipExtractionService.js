const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { uploadsDir } = require('../../middleware/uploadMiddleware');

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.jpg', '.jpeg', '.png'];
const MAX_ZIP_FILES = 10;

/**
 * Extracts and processes documents within a ZIP archive
 */
async function extractZipArchive(zipFilePath, extractDocumentTextFn) {
  if (!fs.existsSync(zipFilePath)) {
    const err = new Error('ZIP file not found on server');
    err.statusCode = 404;
    throw err;
  }

  const tempExtractDir = path.join(uploadsDir, `temp_zip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

  try {
    fs.mkdirSync(tempExtractDir, { recursive: true });
    const zip = new AdmZip(zipFilePath);
    const zipEntries = zip.getEntries();

    if (!zipEntries || zipEntries.length === 0) {
      const err = new Error('ZIP archive is empty');
      err.statusCode = 400;
      throw err;
    }

    const resolvedBase = path.resolve(tempExtractDir);
    const validEntries = [];

    for (const entry of zipEntries) {
      if (entry.isDirectory || entry.entryName.startsWith('__MACOSX') || path.basename(entry.entryName).startsWith('.')) {
        continue;
      }

      // Security Check: Path Traversal Defense
      const targetPath = path.resolve(tempExtractDir, entry.entryName);
      if (!targetPath.startsWith(resolvedBase)) {
        const err = new Error(`Security Violation: Path traversal detected in ZIP entry '${entry.entryName}'`);
        err.statusCode = 400;
        throw err;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        validEntries.push(entry);
      }
    }

    if (validEntries.length === 0) {
      const err = new Error('ZIP archive contains no supported documents (PDF, DOCX, TXT, JPG, PNG)');
      err.statusCode = 400;
      throw err;
    }

    if (validEntries.length > MAX_ZIP_FILES) {
      const err = new Error(`ZIP archive contains ${validEntries.length} supported documents. Maximum limit is ${MAX_ZIP_FILES}.`);
      err.statusCode = 400;
      throw err;
    }

    const extractedDocuments = [];

    for (const entry of validEntries) {
      const extractedFilePath = path.join(tempExtractDir, entry.name);
      fs.writeFileSync(extractedFilePath, entry.getData());

      const result = await extractDocumentTextFn(extractedFilePath, entry.name);
      extractedDocuments.push({
        originalName: entry.name,
        fileType: path.extname(entry.name).substring(1).toLowerCase(),
        extraction: result.extraction,
      });
    }

    return {
      success: true,
      file: {
        originalName: path.basename(zipFilePath),
        fileType: 'zip',
      },
      documents: extractedDocuments,
    };
  } catch (err) {
    if (err.statusCode) throw err;
    const error = new Error(`Failed to process ZIP archive: ${err.message}`);
    error.statusCode = 422;
    throw error;
  } finally {
    // Clean up temporary extraction folder
    if (fs.existsSync(tempExtractDir)) {
      try {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn('[ZipExtractionService] Temp cleanup warning:', cleanupErr.message);
      }
    }
  }
}

module.exports = {
  extractZipArchive,
  SUPPORTED_EXTENSIONS,
  MAX_ZIP_FILES,
};
