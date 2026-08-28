const assert = require('assert');
const { getDb } = require('../config/firebaseAdmin');
const { createReport, getUserReportById, deleteUserReport } = require('../services/reportService');
const { analyzeCopiedContentDocuments } = require('../services/copiedContent/copiedContentService');

console.log('====================================================');
console.log('TRUSTLENS C5: DETAILED REPORT PAGE TEST SUITE');
console.log('====================================================\n');

let testsPassed = 0;
const results = [];
const testUser = {
  uid: `c5_user_${Date.now()}`,
  email: 'c5_tester@trustlens.com',
  name: 'C5 Detailed Report Tester',
  role: 'faculty',
};

const createdReportIds = [];

function recordResult(testName, expected, actualResult, passed) {
  results.push({
    testName,
    expected,
    actualResult,
    status: passed ? 'PASS' : 'FAIL',
  });
  if (passed) testsPassed++;
}

async function runTests() {
  const db = getDb();
  if (!db) {
    console.error('Firebase DB is not initialized. Skipping C5 detailed report tests.');
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 1: Open a saved report
  // --------------------------------------------------------------------------
  let reportId1 = null;
  try {
    const docs = [
      { documentId: 'doc-1', originalName: 'Thesis_A.pdf', extractedText: 'Database normalization eliminates data redundancy across tables.' },
      { documentId: 'doc-2', originalName: 'Thesis_B.pdf', extractedText: 'Database normalization eliminates data redundancy across tables.' },
    ];
    const { pairResults, summary, processedDocs } = analyzeCopiedContentDocuments(docs);
    const documentsMeta = processedDocs.map(d => ({ documentId: d.documentId, originalName: d.originalName }));

    reportId1 = await createReport(
      testUser,
      'copied-content',
      'Copied Content Detection Report',
      documentsMeta,
      summary,
      pairResults,
      `upload_${Date.now()}_c5_test1`
    );
    createdReportIds.push(reportId1);

    const loadedReport = await getUserReportById(reportId1, testUser.uid);

    const passed =
      loadedReport &&
      loadedReport.id === reportId1 &&
      loadedReport.reportType === 'copied-content' &&
      loadedReport.status === 'completed' &&
      loadedReport.createdAt &&
      Array.isArray(loadedReport.documentPairs) &&
      loadedReport.documentPairs.length === 1;

    recordResult('Test 1: Open Saved Report', 'Report loads cleanly from Firestore with all header & pair fields', `id: ${loadedReport?.id}, pairs: ${loadedReport?.documentPairs?.length}`, passed);
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 1 (Open Saved Report): Report loaded with ${loadedReport?.documentPairs?.length} pair(s).`);
  } catch (err) {
    console.error(`[FAIL] Test 1 Error:`, err);
    recordResult('Test 1: Open Saved Report', 'Loaded report details', err.message, false);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Refresh report details page (Reload from Firestore)
  // --------------------------------------------------------------------------
  try {
    const reload1 = await getUserReportById(reportId1, testUser.uid);
    const reload2 = await getUserReportById(reportId1, testUser.uid);

    const passed =
      reload1.id === reportId1 &&
      reload2.id === reportId1 &&
      reload1.createdAt === reload2.createdAt &&
      reload1.documentPairs.length === reload2.documentPairs.length;

    recordResult('Test 2: Page Refresh Reload', 'Reloading report from Firestore returns identical persisted data', `Reload 1 PairId: ${reload1.documentPairs[0]?.pairId}, Reload 2 PairId: ${reload2.documentPairs[0]?.pairId}`, passed);
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 2 (Page Refresh): Data reloaded from Firestore consistently.`);
  } catch (err) {
    console.error(`[FAIL] Test 2 Error:`, err);
    recordResult('Test 2: Page Refresh Reload', 'Reloaded report data', err.message, false);
  }

  // --------------------------------------------------------------------------
  // TEST 3: High-similarity comparison display
  // --------------------------------------------------------------------------
  try {
    const loadedReport = await getUserReportById(reportId1, testUser.uid);
    const pair = loadedReport.documentPairs[0];

    const passed =
      pair.overallMatchedContentPercentage === 100 &&
      Array.isArray(pair.matches) &&
      pair.matches.length > 0 &&
      pair.matches[0].matchType === 'exact_match';

    recordResult('Test 3: High-Similarity Display', '100% similarity pair displays matches and exact match badge', `Score: ${pair.overallMatchedContentPercentage}%, matches: ${pair.matches.length}`, passed);
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 3 (High Similarity): Score ${pair.overallMatchedContentPercentage}%, matches: ${pair.matches.length}.`);
  } catch (err) {
    console.error(`[FAIL] Test 3 Error:`, err);
    recordResult('Test 3: High-Similarity Display', 'High similarity details', err.message, false);
  }

  // --------------------------------------------------------------------------
  // TEST 4: No-significant-similarity comparison display
  // --------------------------------------------------------------------------
  let reportId4 = null;
  try {
    const docs = [
      { documentId: 'doc-1', originalName: 'Paper_A.pdf', extractedText: 'Quantum computing leverages superposition and entanglement.' },
      { documentId: 'doc-2', originalName: 'Paper_B.pdf', extractedText: 'Relational database indexes optimize SQL query performance.' },
    ];
    const { pairResults, summary, processedDocs } = analyzeCopiedContentDocuments(docs);
    const documentsMeta = processedDocs.map(d => ({ documentId: d.documentId, originalName: d.originalName }));

    reportId4 = await createReport(
      testUser,
      'copied-content',
      'Copied Content Detection Report',
      documentsMeta,
      summary,
      pairResults,
      `upload_${Date.now()}_c5_test4`
    );
    createdReportIds.push(reportId4);

    const loadedReport = await getUserReportById(reportId4, testUser.uid);
    const pair = loadedReport.documentPairs[0];

    const passed =
      pair.overallMatchedContentPercentage < 60 &&
      Array.isArray(pair.matches) &&
      pair.matches.length === 0;

    recordResult('Test 4: No-Significant-Similarity Display', 'Score < 60% with 0 matches (no fake matches fabricated)', `Score: ${pair.overallMatchedContentPercentage}%, matches: ${pair.matches.length}`, passed);
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 4 (No Significant Similarity): Score ${pair.overallMatchedContentPercentage}%, 0 fake matches.`);
  } catch (err) {
    console.error(`[FAIL] Test 4 Error:`, err);
    recordResult('Test 4: No-Significant-Similarity Display', 'Low similarity pair', err.message, false);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Multiple documents comparison display
  // --------------------------------------------------------------------------
  let reportId5 = null;
  try {
    const docs = [
      { documentId: 'doc-1', originalName: 'Project_1.pdf', extractedText: 'Software architecture design pattern.' },
      { documentId: 'doc-2', originalName: 'Project_2.pdf', extractedText: 'Software architecture design pattern.' },
      { documentId: 'doc-3', originalName: 'Project_3.pdf', extractedText: 'Artificial intelligence machine learning.' },
    ];
    const { pairResults, summary, processedDocs } = analyzeCopiedContentDocuments(docs);
    const documentsMeta = processedDocs.map(d => ({ documentId: d.documentId, originalName: d.originalName }));

    reportId5 = await createReport(
      testUser,
      'copied-content',
      'Copied Content Detection Report',
      documentsMeta,
      summary,
      pairResults,
      `upload_${Date.now()}_c5_test5`
    );
    createdReportIds.push(reportId5);

    const loadedReport = await getUserReportById(reportId5, testUser.uid);

    const passed =
      loadedReport.documentPairs.length === 3 &&
      loadedReport.documentPairs[0].documentA.originalName &&
      loadedReport.documentPairs[0].documentB.originalName;

    recordResult('Test 5: Multiple Docs Display', 'All 3 pairwise comparison cards loaded with clear document filenames', `Pairs count: ${loadedReport.documentPairs.length}`, passed);
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 5 (Multiple Docs): Loaded ${loadedReport.documentPairs.length} pairs cleanly.`);
  } catch (err) {
    console.error(`[FAIL] Test 5 Error:`, err);
    recordResult('Test 5: Multiple Docs Display', 'Multi-doc report display', err.message, false);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Missing report / 404 handling
  // --------------------------------------------------------------------------
  try {
    let missingHandled = false;
    try {
      await getUserReportById('non_existent_report_id_12345', testUser.uid);
    } catch (err) {
      missingHandled = err.message.includes('not found') || err.message.includes('Report not found') || err.statusCode === 404;
    }

    recordResult('Test 6: Missing Report 404', '404 error thrown on non-existent report ID', missingHandled ? 'Handled 404 cleanly' : 'Not caught', missingHandled);
    console.log(`[${missingHandled ? 'PASS' : 'FAIL'}] Test 6 (Missing Report): Handled missing report with 404 state.`);
  } catch (err) {
    console.error(`[FAIL] Test 6 Error:`, err);
    recordResult('Test 6: Missing Report 404', '404 handling', err.message, false);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Older report / Backward compatibility handling
  // --------------------------------------------------------------------------
  let reportId7 = null;
  try {
    // Save older report structure missing optional fields (no summary.highSimilarityCount, missing matches array)
    const reportRef = db.collection('reports').doc();
    const oldReportData = {
      userId: testUser.uid,
      reportType: 'copied-content',
      title: 'Legacy Copied Content Report',
      status: 'completed',
      createdAt: new Date().toISOString(),
      document: { originalName: 'Legacy.pdf' },
      summary: { totalPairsCompared: 1 },
    };
    await reportRef.set(oldReportData);
    reportId7 = reportRef.id;
    createdReportIds.push(reportId7);

    // Save legacy pair without matches array
    await reportRef.collection('documentPairs').doc('pair_legacy_1').set({
      pairId: 'pair_legacy_1',
      documentA: { originalName: 'Legacy_A.pdf' },
      documentB: { originalName: 'Legacy_B.pdf' },
      similarity: 50,
    });

    const loadedLegacy = await getUserReportById(reportId7, testUser.uid);

    const passed =
      loadedLegacy &&
      loadedLegacy.id === reportId7 &&
      loadedLegacy.reportType === 'copied-content' &&
      Array.isArray(loadedLegacy.documentPairs) &&
      loadedLegacy.documentPairs.length === 1;

    recordResult('Test 7: Backward Compatibility', 'Legacy report loads cleanly without crashing despite missing fields', `Legacy Report ID: ${loadedLegacy.id}`, passed);
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 7 (Backward Compatibility): Legacy report loaded safely without error.`);
  } catch (err) {
    console.error(`[FAIL] Test 7 Error:`, err);
    recordResult('Test 7: Backward Compatibility', 'Legacy report fallback', err.message, false);
  }

  // Cleanup test documents from Firestore
  for (const id of createdReportIds) {
    try {
      await deleteUserReport(id, testUser.uid);
    } catch {
      // Ignore cleanup errors
    }
  }

  console.log('\n====================================================');
  console.log(`RESULTS SUMMARY: ${testsPassed} / 7 TESTS PASSED`);
  console.log('====================================================\n');

  console.table(results);

  if (testsPassed !== 7) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unhandled error in detailed report test suite:', err);
  process.exit(1);
});
