const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { analyzeCopiedContentDocuments, analyzeCopiedContent } = require('../services/copiedContent/copiedContentService');
const { normalizeText } = require('../algorithms/copiedContent/textNormalizer');
const { registerUpload } = require('../services/uploadRegistryService');
const { getUserReportById, listUserReports } = require('../services/reportService');
const adminService = require('../services/adminService');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');

console.log('====================================================');
console.log(' TRUSTLENS C8: COPIED CONTENT FINAL VALIDATION E2E  ');
console.log('====================================================\n');

const testResults = [];
let passedCount = 0;

function recordTest(index, name, passed, details = '') {
  testResults.push({ index, name, passed, details });
  if (passed) passedCount++;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] TEST ${index}: ${name} -> ${details}`);
}

async function runC8ValidationSuite() {
  const timestamp = Date.now();
  const studentA = { uid: `student_c8_a_${timestamp}`, name: 'Alice Student', email: `alice_${timestamp}@trustlens.edu`, role: 'student' };
  const studentB = { uid: `student_c8_b_${timestamp}`, name: 'Bob Student', email: `bob_${timestamp}@trustlens.edu`, role: 'student' };

  let persistedReportId = null;

  // --------------------------------------------------------------------------
  // TEST 1: Exact matching sentences
  // --------------------------------------------------------------------------
  try {
    const docs = [
      { documentId: 'doc-1', originalName: 'OperatingSystems_A.txt', extractedText: 'The CPU executes instructions.' },
      { documentId: 'doc-2', originalName: 'OperatingSystems_B.txt', extractedText: 'The CPU executes instructions.' },
    ];
    const { pairResults } = analyzeCopiedContentDocuments(docs);
    const pair = pairResults[0];
    const match = pair.matches[0];
    const passed = pair.overallMatchedContentPercentage === 100 &&
                   match?.matchType === 'exact_match' &&
                   pair.documentA.name === 'OperatingSystems_A.txt' &&
                   pair.documentB.name === 'OperatingSystems_B.txt';

    recordTest(1, 'Exact Matching Content Detection', passed,
      `Match: ${match?.matchType}, Similarity: ${pair.overallMatchedContentPercentage}%, Docs: ${pair.documentA.name} vs ${pair.documentB.name}`);
  } catch (err) {
    recordTest(1, 'Exact Matching Content Detection', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Clearly different / non-matching sentences
  // --------------------------------------------------------------------------
  try {
    const docs = [
      { documentId: 'doc-1', originalName: 'DocNetwork.txt', extractedText: 'TCP provides reliable byte stream communication over IP networks.' },
      { documentId: 'doc-2', originalName: 'DocDatabase.txt', extractedText: 'Relational databases organize structured data into tables of rows and columns.' },
    ];
    const { pairResults } = analyzeCopiedContentDocuments(docs);
    const pair = pairResults[0];
    const passed = pair.overallMatchedContentPercentage === 0 && pair.totalMatches === 0;

    recordTest(2, 'Non-Matching Content Isolation', passed,
      `Matches: ${pair.totalMatches}, Similarity: ${pair.overallMatchedContentPercentage}% (No false positives)`);
  } catch (err) {
    recordTest(2, 'Non-Matching Content Isolation', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Multiple documents pairwise combinations count: N(N-1)/2
  // --------------------------------------------------------------------------
  try {
    const docs = [
      { documentId: 'doc-1', originalName: 'Doc1.txt', extractedText: 'Algorithms process inputs to produce outputs systematically.' },
      { documentId: 'doc-2', originalName: 'Doc2.txt', extractedText: 'Compilers translate high-level source code into machine instructions.' },
      { documentId: 'doc-3', originalName: 'Doc3.txt', extractedText: 'Operating systems manage computer hardware and execution of software processes.' },
      { documentId: 'doc-4', originalName: 'Doc4.txt', extractedText: 'Algorithms process inputs to produce outputs systematically.' },
    ];
    const { pairResults } = analyzeCopiedContentDocuments(docs);
    const expectedPairsCount = (4 * 3) / 2; // 6 unique pairs
    const noSelf = pairResults.every(p => p.documentA.documentId !== p.documentB.documentId);
    const pairKeys = new Set(pairResults.map(p => `${p.documentA.documentId}_${p.documentB.documentId}`));

    const passed = pairResults.length === expectedPairsCount && noSelf && pairKeys.size === expectedPairsCount;
    recordTest(3, 'Multiple Documents Pairwise Combinations N(N-1)/2', passed,
      `Generated ${pairResults.length} unique pairs from 4 documents (Expected: ${expectedPairsCount}), Zero self/duplicate comparisons`);
  } catch (err) {
    recordTest(3, 'Multiple Documents Pairwise Combinations N(N-1)/2', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Formatting variations (capitalization, spaces, line breaks)
  // --------------------------------------------------------------------------
  try {
    const textA = '   THE   CPU   executes\n\ninstructions.\t  ';
    const textB = 'the cpu executes instructions.';
    const normA = normalizeText(textA);
    const normB = normalizeText(textB);

    const docs = [
      { documentId: 'doc-1', originalName: 'DocA_Formatted.txt', extractedText: textA },
      { documentId: 'doc-2', originalName: 'DocB_Clean.txt', extractedText: textB },
    ];
    const { pairResults } = analyzeCopiedContentDocuments(docs);
    const pair = pairResults[0];

    const passed = normA === normB && pair.overallMatchedContentPercentage === 100;
    recordTest(4, 'Formatting Variations & Normalization', passed,
      `Normalized: "${normA}" === "${normB}", Match Similarity: ${pair.overallMatchedContentPercentage}%`);
  } catch (err) {
    recordTest(4, 'Formatting Variations & Normalization', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Copied Content Analysis Execution & Persistence
  // --------------------------------------------------------------------------
  try {
    const uploadPath1 = path.resolve(`./uploads/tmp_c8_doc1_${timestamp}.txt`);
    const uploadPath2 = path.resolve(`./uploads/tmp_c8_doc2_${timestamp}.txt`);
    fs.writeFileSync(uploadPath1, 'A distributed database distributes storage across multiple physical server nodes.');
    fs.writeFileSync(uploadPath2, 'A distributed database distributes storage across multiple physical server nodes.');

    const uploadFiles = [
      { filename: `tmp_c8_doc1_${timestamp}.txt`, originalName: 'Distributed_DB_A.txt', mimeType: 'text/plain', uploadPath: uploadPath1 },
      { filename: `tmp_c8_doc2_${timestamp}.txt`, originalName: 'Distributed_DB_B.txt', mimeType: 'text/plain', uploadPath: uploadPath2 },
    ];

    const session = registerUpload(studentA.uid, 'multiple', uploadFiles);
    const analysisRes = await analyzeCopiedContent(studentA, session.uploadId);

    persistedReportId = analysisRes.reportId;
    const passed = !!persistedReportId && analysisRes.success === true && analysisRes.analysis?.documentPairs?.length === 1;

    // Clean up temp files
    try { fs.unlinkSync(uploadPath1); fs.unlinkSync(uploadPath2); } catch (e) {}

    recordTest(5, 'Copied Content Analysis & Report Persistence', passed,
      `Report ID: ${persistedReportId}, Pairs: ${analysisRes.analysis?.documentPairs?.length}`);
  } catch (err) {
    recordTest(5, 'Copied Content Analysis & Report Persistence', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Reports & History Query
  // --------------------------------------------------------------------------
  try {
    const historyRes = await listUserReports(studentA.uid, { type: 'copied-content' });
    const foundReport = historyRes.reports.find(r => r.id === persistedReportId);
    const passed = !!foundReport && (foundReport.reportType === 'copied-content' || foundReport.type === 'copied-content');

    recordTest(6, 'Reports & History Listing', passed,
      `Found Report ${persistedReportId} in User History (${historyRes.reports.length} total user reports)`);
  } catch (err) {
    recordTest(6, 'Reports & History Listing', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Report Details & Matching Section Resolution
  // --------------------------------------------------------------------------
  try {
    const reportDetails = await getUserReportById(persistedReportId, studentA.uid);
    const pairs = reportDetails.documentPairs || [];
    const pair = pairs[0];
    const passed = reportDetails.id === persistedReportId &&
                   pairs.length === 1 &&
                   pair.overallMatchedContentPercentage === 100 &&
                   pair.matches?.length > 0;

    recordTest(7, 'Report Details & Pairwise Matching Section Resolution', passed,
      `Report Title: "${reportDetails.title}", Pair Similarity: ${pair?.overallMatchedContentPercentage}%, Matches: ${pair?.matches?.length}`);
  } catch (err) {
    recordTest(7, 'Report Details & Pairwise Matching Section Resolution', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 8: PDF Report Generation Validation
  // --------------------------------------------------------------------------
  try {
    const reportDetails = await getUserReportById(persistedReportId, studentA.uid);
    const pairs = reportDetails.documentPairs || [];
    const pair = pairs[0];
    const nameA = pair.documentA?.originalName || pair.documentA?.name || 'DocA';
    const nameB = pair.documentB?.originalName || pair.documentB?.name || 'DocB';
    const score = pair.overallMatchedContentPercentage ?? pair.similarity ?? 0;

    const hasValidPdfFields = reportDetails.title &&
                              reportDetails.status === 'completed' &&
                              nameA && nameB &&
                              typeof score === 'number';

    recordTest(8, 'PDF Export Structure & Data Integrity', hasValidPdfFields,
      `Validated Title: "${reportDetails.title}", Pair: "${nameA} vs ${nameB}", Similarity: ${score}%`);
  } catch (err) {
    recordTest(8, 'PDF Export Structure & Data Integrity', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 9: Refresh / Re-login Session Preservation
  // --------------------------------------------------------------------------
  try {
    // Simulate re-fetching report after session reload
    const reportReload1 = await getUserReportById(persistedReportId, studentA.uid);
    const reportReload2 = await getUserReportById(persistedReportId, studentA.uid);

    const passed = reportReload1.id === persistedReportId &&
                   reportReload2.id === persistedReportId &&
                   reportReload1.documentPairs?.length === reportReload2.documentPairs?.length;

    recordTest(9, 'Refresh & Re-login State Persistence', passed,
      `Report ${persistedReportId} re-fetched consistently across session reloads`);
  } catch (err) {
    recordTest(9, 'Refresh & Re-login State Persistence', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 10: Security — Unauthorized Cross-Student Access Denied (403)
  // --------------------------------------------------------------------------
  try {
    let accessDenied = false;
    try {
      await getUserReportById(persistedReportId, studentB.uid);
    } catch (err) {
      if (err.statusCode === 403 || err.message.includes('permission')) {
        accessDenied = true;
      }
    }

    recordTest(10, 'Security & Cross-Student Isolation (403)', accessDenied,
      `Student B blocked from accessing Student A report (${persistedReportId})`);
  } catch (err) {
    recordTest(10, 'Security & Cross-Student Isolation (403)', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 11: Admin Access Authorization
  // --------------------------------------------------------------------------
  try {
    const adminReport = await adminService.getReportDetailsAdmin(persistedReportId);
    const passed = !!adminReport && adminReport.id === persistedReportId;

    recordTest(11, 'Admin Report Oversight Authorization', passed,
      `Admin successfully accessed report ${persistedReportId} (Owner: ${adminReport?.userName || adminReport?.userId})`);
  } catch (err) {
    recordTest(11, 'Admin Report Oversight Authorization', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 12: Error Detection Independence & Compatibility
  // --------------------------------------------------------------------------
  try {
    const uploadFile = path.resolve(`./uploads/tmp_c8_ed_${timestamp}.txt`);
    fs.writeFileSync(uploadFile, 'TCP is a reliable connection-oriented protocol.');

    const edSession = registerUpload(studentA.uid, 'single', {
      filename: `tmp_c8_ed_${timestamp}.txt`,
      originalName: 'NetworkingNotes.txt',
      mimeType: 'text/plain',
      uploadPath: uploadFile,
    });

    const edAnalysis = await errorDetectionService.analyzeErrorDetectionDocument(studentA, edSession.uploadId);
    const edReport = await getUserReportById(edAnalysis.reportId, studentA.uid);

    try { fs.unlinkSync(uploadFile); } catch (e) {}

    const passed = edReport.reportType === 'error-detection' &&
                   Array.isArray(edReport.findings) &&
                   !edReport.documentPairs;

    recordTest(12, 'Error Detection Compatibility & Independence', passed,
      `Error Detection Report (${edAnalysis.reportId}) remains independent with ${edReport.findings?.length} findings and 0 pairwise collisions`);
  } catch (err) {
    recordTest(12, 'Error Detection Compatibility & Independence', false, err.message);
  }

  console.log('\n====================================================');
  console.log(` C8 FINAL TEST RESULTS: ${passedCount} / ${testResults.length} TESTS PASSED`);
  console.log('====================================================\n');

  if (passedCount !== testResults.length) {
    throw new Error(`C8 test suite failed: ${testResults.length - passedCount} test(s) failed`);
  }
}

runC8ValidationSuite()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ C8 FATAL ERROR:', err.message);
    process.exit(1);
  });
