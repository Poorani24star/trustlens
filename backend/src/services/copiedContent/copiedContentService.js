const { validateOwnership } = require('../uploadRegistryService');
const { extractDocumentText, extractZipArchive } = require('../extraction/documentExtractionService');
const { createReport } = require('../reportService');

const { MIN_DOCUMENTS, MAX_SUPPORTED_DOCUMENTS } = require('../../config/copiedContentConfig');
const { segmentPassages } = require('../../algorithms/copiedContent/passageSegmenter');
const { generatePairs } = require('../../algorithms/copiedContent/pairGenerator');
const { compareAndAggregateDocumentPair, buildOverallAnalysisSummary } = require('../../algorithms/copiedContent/resultAggregator');

/**
 * Runs the Phase 13B Copied Content algorithm pipeline over an array of document objects
 * @param {Array<{documentId: string, originalName: string, extractedText: string}>} rawDocuments 
 * @returns {{pairResults: Array<Object>, summary: Object, processedDocs: Array<Object>}}
 */
function analyzeCopiedContentDocuments(rawDocuments) {
  if (!Array.isArray(rawDocuments)) {
    const err = new Error('Invalid document input. Expected array of document objects.');
    err.statusCode = 400;
    throw err;
  }

  const validDocs = [];
  const failedDocs = [];

  for (const doc of rawDocuments) {
    if (doc && typeof doc.extractedText === 'string' && doc.extractedText.trim().length > 0) {
      validDocs.push(doc);
    } else {
      failedDocs.push({
        documentId: doc?.documentId || 'unknown',
        originalName: doc?.originalName || doc?.documentName || 'Unknown Document',
        reason: 'Failed text extraction or empty document content',
      });
    }
  }

  if (validDocs.length < MIN_DOCUMENTS) {
    const err = new Error(`At least ${MIN_DOCUMENTS} valid non-empty documents are required for copied content detection`);
    err.statusCode = 400;
    throw err;
  }

  // Limit processing to MAX_SUPPORTED_DOCUMENTS
  const docsToProcess = validDocs.slice(0, MAX_SUPPORTED_DOCUMENTS);

  // Step 4: Segment passages per document
  const processedDocs = docsToProcess.map(doc => ({
    ...doc,
    documentName: doc.originalName || doc.documentName || doc.documentId,
    passages: segmentPassages(doc.documentId, doc.originalName || doc.documentId, doc.extractedText),
  }));

  // Step 8: Generate pairwise document combinations N(N-1)/2
  const documentPairs = generatePairs(processedDocs);
  const pairResults = [];

  // Step 9-16: Compare passages for each unique document pair
  for (const pair of documentPairs) {
    const aggregatedResult = compareAndAggregateDocumentPair(pair.pairId, pair.docA, pair.docB);
    pairResults.push(aggregatedResult);
  }

  // Step 17: Build overall analysis summary
  const summary = buildOverallAnalysisSummary(processedDocs.length, pairResults);
  summary.failedDocuments = failedDocs;
  summary.failedDocumentCount = failedDocs.length;

  return {
    pairResults,
    summary,
    processedDocs,
    failedDocs,
  };
}

/**
 * Main orchestrator executing Copied Content Detection across uploaded document files or ZIP archive
 */
async function analyzeCopiedContent(user, temporaryUploadId) {
  const userUid = typeof user === 'string' ? user : user.uid;
  const userObj = typeof user === 'string' ? { uid: userUid } : user;

  // Step 1: Validate temporary upload session and ownership
  const session = validateOwnership(temporaryUploadId, userUid);

  if (!session.files || session.files.length === 0) {
    const err = new Error('No uploaded document files found in session');
    err.statusCode = 400;
    throw err;
  }

  const extractedDocuments = [];
  let docCounter = 1;

  // Step 2: Extract text for all files in upload session (handling multi-file and ZIP)
  for (const file of session.files) {
    const fileName = file.originalName || file.originalname || file.name || '';
    const mime = file.mimeType || file.mimetype || '';
    const isZip = mime === 'application/zip' || fileName.toLowerCase().endsWith('.zip');

    if (isZip) {
      const zipResult = await extractDocumentText(file.uploadPath, file.originalName, file.mimeType);
      const zipDocs = zipResult?.documents || [];

      for (const doc of zipDocs) {
        const text = doc.extraction?.text || '';
        if (text && text.trim().length > 0) {
          extractedDocuments.push({
            documentId: `doc-${docCounter++}`,
            originalName: doc.originalName,
            mimeType: doc.mimeType || `application/${doc.fileType || 'pdf'}`,
            extractedText: text,
          });
        }
      }
    } else {
      const textResult = await extractDocumentText(file.uploadPath, file.originalName, file.mimeType);
      const text = textResult.extraction ? textResult.extraction.text : '';

      if (text && text.trim().length > 0) {
        extractedDocuments.push({
          documentId: `doc-${docCounter++}`,
          originalName: file.originalName,
          mimeType: file.mimeType,
          extractedText: text,
        });
      }
    }
  }

  // Step 3-17: Run core algorithm pipeline
  const { pairResults, summary, processedDocs } = analyzeCopiedContentDocuments(extractedDocuments);

  const documentsMeta = processedDocs.map(d => ({
    documentId: d.documentId,
    originalName: d.originalName,
  }));

  // Step 21: Save persistent report to Cloud Firestore
  const reportTitle = `Copied Content - ${processedDocs.length} Documents`;
  const reportId = await createReport(
    userObj,
    'copied-content',
    reportTitle,
    documentsMeta,
    summary,
    pairResults,
    temporaryUploadId
  );

  return {
    success: true,
    reportId,
    analysis: {
      analysisId: `cc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      summary,
      documentPairs: pairResults,
    },
  };
}

module.exports = {
  analyzeCopiedContentDocuments,
  analyzeCopiedContent,
};
