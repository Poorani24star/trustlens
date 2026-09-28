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
function analyzeCopiedContentDocuments(rawDocuments, options = {}) {
  const { onProgress, abortSignal } = options;

  if (abortSignal?.aborted) {
    throw new Error('Analysis cancelled by user');
  }

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

  if (onProgress) {
    onProgress({
      stage: 'segmenting',
      stageTitle: 'Segmenting Passages',
      percent: 45,
      currentStep: 3,
      message: `Segmenting passages across ${docsToProcess.length} documents…`
    });
  }

  // Step 4: Segment passages per document
  const processedDocs = docsToProcess.map(doc => ({
    ...doc,
    documentName: doc.originalName || doc.documentName || doc.documentId,
    passages: segmentPassages(doc.documentId, doc.originalName || doc.documentId, doc.extractedText),
  }));

  if (abortSignal?.aborted) {
    throw new Error('Analysis cancelled by user');
  }

  // Step 8: Generate pairwise document combinations N(N-1)/2
  const documentPairs = generatePairs(processedDocs);
  const pairResults = [];

  if (onProgress) {
    onProgress({
      stage: 'pairing',
      stageTitle: 'Generated Document Pairs',
      percent: 50,
      currentStep: 3,
      pairs: { current: 0, total: documentPairs.length, currentPair: '' },
      message: `Generated ${documentPairs.length} pairwise comparisons to analyze…`
    });
  }

  // Step 9-16: Compare passages for each unique document pair
  for (let i = 0; i < documentPairs.length; i++) {
    if (abortSignal?.aborted) {
      throw new Error('Analysis cancelled by user');
    }

    const pair = documentPairs[i];
    const pairNames = `${pair.docA.documentName} vs ${pair.docB.documentName}`;

    if (onProgress) {
      const pairPercent = Math.min(92, Math.round(50 + ((i + 1) / documentPairs.length) * 42));
      onProgress({
        stage: 'comparing',
        stageTitle: 'Pairwise Content Comparison',
        percent: pairPercent,
        currentStep: 3,
        pairs: {
          current: i + 1,
          total: documentPairs.length,
          currentPair: pairNames
        },
        message: `Comparing pair ${i + 1} of ${documentPairs.length}: ${pairNames}…`
      });
    }

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
async function analyzeCopiedContent(user, temporaryUploadId, options = {}) {
  const { onProgress, abortSignal } = options;

  if (abortSignal?.aborted) {
    throw new Error('Analysis cancelled by user');
  }

  const userUid = typeof user === 'string' ? user : user.uid;
  const userObj = typeof user === 'string' ? { uid: userUid } : user;

  // Step 1: Validate temporary upload session and ownership
  const session = validateOwnership(temporaryUploadId, userUid);

  if (!session.files || session.files.length === 0) {
    const err = new Error('No uploaded document files found in session');
    err.statusCode = 400;
    throw err;
  }

  if (onProgress) {
    onProgress({
      stage: 'extracting',
      stageTitle: 'Extracting Documents',
      percent: 10,
      currentStep: 2,
      message: `Extracting text from ${session.files.length} uploaded document files…`
    });
  }

  const extractedDocuments = [];
  let docCounter = 1;

  // Step 2: Extract text for all files in upload session (handling multi-file and ZIP)
  for (let i = 0; i < session.files.length; i++) {
    if (abortSignal?.aborted) {
      throw new Error('Analysis cancelled by user');
    }

    const file = session.files[i];
    const fileName = file.originalName || file.originalname || file.name || '';
    const mime = file.mimeType || file.mimetype || '';
    const isZip = mime === 'application/zip' || fileName.toLowerCase().endsWith('.zip');

    const extractPercent = Math.min(45, Math.round(10 + ((i + 1) / session.files.length) * 35));

    if (onProgress) {
      onProgress({
        stage: 'extracting',
        stageTitle: 'Extracting Documents',
        percent: extractPercent,
        currentStep: 2,
        message: `Extracting text from ${fileName} (${i + 1}/${session.files.length})…`,
        fileUpdate: {
          name: fileName,
          status: 'extracting',
          progress: 50
        }
      });
    }

    if (isZip) {
      const zipResult = await extractZipArchive(file.uploadPath, null, {
        abortSignal,
        onProgress: (zipProgress) => {
          if (onProgress) {
            onProgress({
              stage: 'extracting',
              stageTitle: 'Extracting ZIP Archive',
              percent: Math.min(45, Math.round(10 + (zipProgress.current / zipProgress.total) * 35)),
              currentStep: 2,
              message: zipProgress.message,
              fileUpdate: {
                name: zipProgress.fileName,
                status: 'extracting',
                progress: 50
              }
            });
          }
        }
      });
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

          if (onProgress) {
            onProgress({
              fileUpdate: {
                name: doc.originalName,
                status: 'completed',
                progress: 100
              }
            });
          }
        } else {
          if (onProgress) {
            onProgress({
              fileUpdate: {
                name: doc.originalName,
                status: 'failed',
                error: 'Empty document or extraction failed'
              }
            });
          }
        }
      }
    } else {
      let textResult;
      try {
        const onDocOcrProgress = (ocrPct) => {
          if (onProgress) {
            onProgress({
              stage: 'extracting',
              stageTitle: 'OCR Processing',
              percent: Math.min(40, Math.round(15 + (ocrPct / 100) * 25)),
              message: `Optical Character Recognition (${ocrPct}%) on ${file.originalName}…`,
              fileUpdate: {
                name: file.originalName,
                status: 'extracting',
                progress: ocrPct
              }
            });
          }
        };
        textResult = await extractDocumentText(file.uploadPath, file.originalName, file.mimeType, { onProgress: onDocOcrProgress });
      } catch (err) {
        console.warn(`[CopiedContentService] Extraction error on ${file.originalName}:`, err.message);
        textResult = { extraction: { text: '' } };
      }

      const text = textResult.extraction ? textResult.extraction.text : '';

      if (text && text.trim().length > 0) {
        extractedDocuments.push({
          documentId: `doc-${docCounter++}`,
          originalName: file.originalName,
          mimeType: file.mimeType,
          extractedText: text,
        });

        if (onProgress) {
          onProgress({
            fileUpdate: {
              name: file.originalName,
              status: 'completed',
              progress: 100
            }
          });
        }
      } else {
        if (onProgress) {
          onProgress({
            fileUpdate: {
              name: file.originalName,
              status: 'failed',
              error: 'Empty document or extraction failed'
            }
          });
        }
      }
    }
  }

  if (abortSignal?.aborted) {
    throw new Error('Analysis cancelled by user');
  }

  // Step 3-17: Run core algorithm pipeline
  const { pairResults, summary, processedDocs } = analyzeCopiedContentDocuments(extractedDocuments, {
    onProgress,
    abortSignal
  });

  if (abortSignal?.aborted) {
    throw new Error('Analysis cancelled by user');
  }

  if (onProgress) {
    onProgress({
      stage: 'saving',
      stageTitle: 'Saving Report',
      percent: 95,
      currentStep: 4,
      message: 'Compiling analysis summary and saving report to Firestore…'
    });
  }

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
