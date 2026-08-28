const assert = require('assert');
const { getDb } = require('../config/firebaseAdmin');
const { createReport, getUserReportById, listUserReports, deleteUserReport } = require('../services/reportService');
const { analyzeCopiedContentDocuments } = require('../services/copiedContent/copiedContentService');

console.log('====================================================');
console.log('TRUSTLENS C4: FIREBASE PERSISTENCE TEST SUITE');
console.log('====================================================\n');

let testsPassed = 0;
const results = [];
const testUser = {
  uid: `test_user_${Date.now()}`,
  email: 'c4_tester@trustlens.com',
  name: 'C4 Test User',
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
    console.error('Firebase DB is not initialized. Skipping live persistence tests.');
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 1: Complete copied-content analysis and save report to Firebase
  // --------------------------------------------------------------------------
  let reportId1 = null;
  try {
    const docs = [
      { documentId: 'doc-1', originalName: 'Submission_A.pdf', extractedText: 'TCP is a connection-oriented transport protocol.' },
      { documentId: 'doc-2', originalName: 'Submission_B.pdf', extractedText: 'TCP is a connection-oriented transport protocol.' },
    ];
    const { pairResults, summary, processedDocs } = analyzeCopiedContentDocuments(docs);
    const documentsMeta = processedDocs.map(d => ({ documentId: d.documentId, originalName: d.originalName }));

    reportId1 = await createReport(
      testUser,
      'copied-content',
      `Copied Content - ${processedDocs.length} Documents`,
      documentsMeta,
      summary,
      pairResults,
      `upload_${Date.now()}_test1`
    );
    createdReportIds.push(reportId1);

    const passed = typeof reportId1 === 'string' && reportId1.length > 5;
    recordResult('Test 1: Save Report to Firebase', 'Valid Firestore reportId returned', `reportId: ${reportId1}`, passed);
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 1 (Save Report): Report saved to Firestore with ID: ${reportId1}`);
  } catch (err) {
    console.error(`[FAIL] Test 1 Error:`, err);
    recordResult('Test 1: Save Report to Firebase', 'Saved report ID', err.message, false);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Navigate to Reports & History / Query User Reports
  // --------------------------------------------------------------------------
  try {
    const userReports = await listUserReports(testUser.uid);
    const foundReport = userReports.reports.find(r => r.id === reportId1);

    const passed =
      foundReport &&
      foundReport.reportType === 'copied-content' &&
      foundReport.status === 'completed' &&
      foundReport.userId === testUser.uid;

    recordResult('Test 2: Reports & History Query', 'Report listed under user account in Firestore', foundReport ? `Type: ${foundReport.reportType}, Status: ${foundReport.status}` : 'Not found', passed);
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 2 (Query History): Found report in user's persisted reports list.`);
  } catch (err) {
    console.error(`[FAIL] Test 2 Error:`, err);
    recordResult('Test 2: Reports & History Query', 'Listed report', err.message, false);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Refresh browser / Persistence check
  // --------------------------------------------------------------------------
  try {
    const details = await getUserReportById(reportId1, testUser.uid);

    const passed =
      details &&
      details.id === reportId1 &&
      details.reportType === 'copied-content' &&
      Array.isArray(details.documentPairs) &&
      details.documentPairs.length === 1;

    recordResult('Test 3: Browser Refresh Persistence', 'Report and documentPairs subcollection persist cleanly', `documentPairs count: ${details?.documentPairs?.length}`, passed);
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 3 (Persistence Check): Retrieved report details and subcollection.`);
  } catch (err) {
    console.error(`[FAIL] Test 3 Error:`, err);
    recordResult('Test 3: Browser Refresh Persistence', 'Persisted report details', err.message, false);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Multiple documents persistence
  // --------------------------------------------------------------------------
  let reportId4 = null;
  try {
    const docs = [
      { documentId: 'doc-1', originalName: 'Assignment_1.pdf', extractedText: 'TCP protocol ensures reliable delivery.' },
      { documentId: 'doc-2', originalName: 'Assignment_2.pdf', extractedText: 'TCP protocol ensures reliable delivery.' },
      { documentId: 'doc-3', originalName: 'Assignment_3.pdf', extractedText: 'Operating systems manage hardware memory.' },
    ];
    const { pairResults, summary, processedDocs } = analyzeCopiedContentDocuments(docs);
    const documentsMeta = processedDocs.map(d => ({ documentId: d.documentId, originalName: d.originalName }));

    reportId4 = await createReport(
      testUser,
      'copied-content',
      `Copied Content - ${processedDocs.length} Documents`,
      documentsMeta,
      summary,
      pairResults,
      `upload_${Date.now()}_test4`
    );
    createdReportIds.push(reportId4);

    const details = await getUserReportById(reportId4, testUser.uid);

    const passed =
      details.documentPairs.length === 3 &&
      details.document.length === 3 &&
      details.document[0].originalName === 'Assignment_1.pdf';

    recordResult('Test 4: Multiple Docs Persistence', '3 documents & 3 comparison pairs persisted in subcollection', `Documents: ${details.document.length}, Pairs: ${details.documentPairs.length}`, passed);
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 4 (Multi-Doc Persistence): Saved ${details.document.length} docs and ${details.documentPairs.length} pairs.`);
  } catch (err) {
    console.error(`[FAIL] Test 4 Error:`, err);
    recordResult('Test 4: Multiple Docs Persistence', 'Multi-doc report', err.message, false);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Firebase save failure handling
  // --------------------------------------------------------------------------
  try {
    let failureHandled = false;
    try {
      // Intentionally pass invalid null user object to simulate save failure
      await createReport(null, 'copied-content', 'Test Fail Report', [], {}, []);
    } catch (err) {
      failureHandled = err.message.includes('Cannot read properties') || err.message.includes('user') || err.message.includes('Firestore') || err.message.includes('uid');
    }

    recordResult('Test 5: Save Failure Handling', 'Error thrown on save failure, preventing false completion', failureHandled ? 'Save failure caught cleanly' : 'Not caught', failureHandled);
    console.log(`[${failureHandled ? 'PASS' : 'FAIL'}] Test 5 (Save Failure): System threw error on save failure without false navigation.`);
  } catch (err) {
    console.error(`[FAIL] Test 5 Error:`, err);
    recordResult('Test 5: Save Failure Handling', 'Error handling', err.message, false);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Duplicate save trigger / Idempotency
  // --------------------------------------------------------------------------
  try {
    const uploadId = `upload_${Date.now()}_idempotency_test`;
    const docs = [
      { documentId: 'doc-1', originalName: 'Doc_A.pdf', extractedText: 'Sample text for idempotency.' },
      { documentId: 'doc-2', originalName: 'Doc_B.pdf', extractedText: 'Sample text for idempotency.' },
    ];
    const { pairResults, summary, processedDocs } = analyzeCopiedContentDocuments(docs);
    const documentsMeta = processedDocs.map(d => ({ documentId: d.documentId, originalName: d.originalName }));

    // Save report first time
    const repId1 = await createReport(testUser, 'copied-content', 'Copied Content', documentsMeta, summary, pairResults, uploadId);
    createdReportIds.push(repId1);

    // Save report second time with same uploadId
    const repId2 = await createReport(testUser, 'copied-content', 'Copied Content', documentsMeta, summary, pairResults, uploadId);

    const passed = repId1 === repId2;
    recordResult('Test 6: Duplicate Prevention', 'Same uploadId returns existing reportId (Idempotent)', `Rep1: ${repId1}, Rep2: ${repId2}`, passed);
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 6 (Duplicate Prevention): Verified repId1 === repId2 (${repId1}).`);
  } catch (err) {
    console.error(`[FAIL] Test 6 Error:`, err);
    recordResult('Test 6: Duplicate Prevention', 'Idempotent save', err.message, false);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Verify Error Detection reports remain unchanged
  // --------------------------------------------------------------------------
  let reportId7 = null;
  try {
    const errorDetectionReportId = await createReport(
      testUser,
      'error-detection',
      'CS Paper Error Analysis',
      { domain: 'Computer Science', primaryTopic: 'Networking' },
      { totalStatements: 1, verified: 1, incorrect: 0 },
      [{ statementId: 'stmt-1', index: 0, statementText: 'TCP is reliable.', classification: 'supported' }],
      `upload_${Date.now()}_test7`
    );
    createdReportIds.push(errorDetectionReportId);

    const details = await getUserReportById(errorDetectionReportId, testUser.uid);

    const passed =
      details.reportType === 'error-detection' &&
      Array.isArray(details.findings) &&
      details.findings.length === 1 &&
      details.findings[0].classification === 'supported';

    recordResult('Test 7: Error Detection Unchanged', 'Error Detection reports remain intact with findings subcollection', `reportType: ${details.reportType}, findings: ${details.findings.length}`, passed);
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 7 (Error Detection Unchanged): Verified error-detection type & findings subcollection.`);
  } catch (err) {
    console.error(`[FAIL] Test 7 Error:`, err);
    recordResult('Test 7: Error Detection Unchanged', 'Error detection integrity', err.message, false);
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
  console.error('Unhandled error in persistence test suite:', err);
  process.exit(1);
});
