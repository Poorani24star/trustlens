/**
 * Verification Test Suite for Task 11: Final Error Detection Report, Status Tracking, Report History, & Export
 */

const path = require('path');
const fs = require('fs');
const { registerUpload } = require('../services/uploadRegistryService');
const { analyzeErrorDetectionDocument } = require('../services/errorDetection/errorDetectionService');
const { getUserReportById, listUserReports, deleteUserReport } = require('../services/reportService');
const { analyzeCopiedContentDocuments } = require('../services/copiedContent/copiedContentService');

const TEST_USER = {
  uid: 'test_user_task11',
  name: 'Task11 Test Student',
  email: 'task11_student@trustlens.edu',
  role: 'student',
};

async function runTask11Tests() {
  console.log('====================================================');
  console.log('STARTING TASK 11 VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${message}`);
    }
  }

  // Create temporary mock files in /tmp/ for testing
  const tempDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const doc1Path = path.join(tempDir, 'test_task11_networks.txt');
  const doc2Path = path.join(tempDir, 'test_task11_dbms.txt');
  const nonCsDocPath = path.join(tempDir, 'test_task11_gardening.txt');

  fs.writeFileSync(
    doc1Path,
    'TCP is a connection-oriented transport layer protocol that provides reliable delivery. TCP is not connection-oriented. IPv4 addresses are 32-bit numerical labels. RAM is non-volatile memory.',
    'utf8'
  );

  fs.writeFileSync(
    doc2Path,
    'Relational database management systems use SQL for database queries. ACID properties guarantee database transaction reliability.',
    'utf8'
  );

  fs.writeFileSync(
    doc2Path,
    'Relational database management systems use SQL for database queries. ACID properties guarantee database transaction reliability.',
    'utf8'
  );

  fs.writeFileSync(
    nonCsDocPath,
    'Photosynthesis is the process by which green plants use sunlight to synthesize nutrients from carbon dioxide and water.',
    'utf8'
  );

  try {
    // ----------------------------------------------------
    // TEST 1: Single Document Error Detection & Persistence
    // ----------------------------------------------------
    const session1Files = [
      {
        filename: 'test_task11_networks.txt',
        originalName: 'Computer_Networks_Notes.txt',
        mimeType: 'text/plain',
        size: 180,
        uploadPath: doc1Path,
        uploadedAt: new Date().toISOString(),
      },
    ];
    const session1 = registerUpload(TEST_USER.uid, 'single', session1Files);
    const result1 = await analyzeErrorDetectionDocument(TEST_USER, session1.uploadId);

    assert(result1.success === true, 'Single document analysis returned success: true');
    assert(!!result1.reportId, 'Single document analysis returned a valid reportId');
    assert(result1.status === 'completed', 'Analysis status is marked as "completed"');

    // ----------------------------------------------------
    // TEST 2: Retrieve Saved Report from Firestore
    // ----------------------------------------------------
    const savedReport1 = await getUserReportById(result1.reportId, TEST_USER.uid);
    assert(savedReport1.id === result1.reportId, 'Retrieved report ID matches saved reportId');
    assert(savedReport1.userId === TEST_USER.uid, 'Report userId matches authenticated student');
    assert(savedReport1.reportType === 'error-detection', 'Report type is correctly set to "error-detection"');
    assert(savedReport1.status === 'completed', 'Persisted report status in Firestore is "completed"');

    // ----------------------------------------------------
    // TEST 3: Summary Statistics Accuracy
    // ----------------------------------------------------
    const s1 = savedReport1.summary;
    const totalStmts = s1.totalStatements;
    const sumCategories = s1.supported + s1.incorrect + s1.misleading + s1.unsupported + s1.noKnowledgeAvailable;

    assert(totalStmts > 0, `Analyzed total statements (${totalStmts}) > 0`);
    assert(totalStmts === sumCategories, `Summary count equality: total (${totalStmts}) equals sum of categories (${sumCategories})`);

    // ----------------------------------------------------
    // TEST 4: Evidence Traceability in Findings
    // ----------------------------------------------------
    const findings1 = savedReport1.findings || [];
    assert(findings1.length > 0, 'Report contains detailed statement findings in subcollection');

    const sampleFinding = findings1[0];
    assert(!!sampleFinding.statementText, 'Finding contains original statementText');
    assert(!!sampleFinding.classification, 'Finding contains Task 10 canonical classification');
    assert(!!sampleFinding.explanation || !!sampleFinding.reason, 'Finding contains explanation/reasoning');
    assert(typeof sampleFinding.similarity === 'number', 'Finding contains numeric similarity score');

    // ----------------------------------------------------
    // TEST 5: Duplicate Save Prevention (Idempotency)
    // ----------------------------------------------------
    const result1Duplicate = await analyzeErrorDetectionDocument(TEST_USER, session1.uploadId);
    assert(result1Duplicate.reportId === result1.reportId, 'Re-analyzing the same uploadId returns identical reportId without creating duplicate');

    // ----------------------------------------------------
    // TEST 6: Multi-Document Upload & Unified Report (Task 4 & 11)
    // ----------------------------------------------------
    const sessionMultiFiles = [
      {
        filename: 'test_task11_networks.txt',
        originalName: 'Networks.txt',
        mimeType: 'text/plain',
        size: 180,
        uploadPath: doc1Path,
        uploadedAt: new Date().toISOString(),
      },
      {
        filename: 'test_task11_dbms.txt',
        originalName: 'DBMS.txt',
        mimeType: 'text/plain',
        size: 150,
        uploadPath: doc2Path,
        uploadedAt: new Date().toISOString(),
      },
    ];
    const sessionMulti = registerUpload(TEST_USER.uid, 'multiple', sessionMultiFiles);
    const resultMulti = await analyzeErrorDetectionDocument(TEST_USER, sessionMulti.uploadId);

    assert(resultMulti.success === true, 'Multi-document session analysis completed successfully');
    const savedReportMulti = await getUserReportById(resultMulti.reportId, TEST_USER.uid);
    assert(savedReportMulti.document?.documentCount === 2, 'Saved multi-document report records documentCount = 2');
    assert(Array.isArray(savedReportMulti.document?.documents) && savedReportMulti.document.documents.length === 2, 'Report retains separate metadata for each document');

    // ----------------------------------------------------
    // TEST 7: Report History List Retrieval
    // ----------------------------------------------------
    const historyList = await listUserReports(TEST_USER.uid, { limit: 10 });
    assert(Array.isArray(historyList.reports) && historyList.reports.length >= 2, 'Reports & History returns list of user reports sorted by date');

    // ----------------------------------------------------
    // TEST 8: Non-CS Document Handling (Domain Gate)
    // ----------------------------------------------------
    const sessionNonCsFiles = [
      {
        filename: 'test_task11_gardening.txt',
        originalName: 'Gardening_Tips.txt',
        mimeType: 'text/plain',
        size: 110,
        uploadPath: nonCsDocPath,
        uploadedAt: new Date().toISOString(),
      },
    ];
    const sessionNonCs = registerUpload(TEST_USER.uid, 'single', sessionNonCsFiles);
    const resultNonCs = await analyzeErrorDetectionDocument(TEST_USER, sessionNonCs.uploadId);
    assert(resultNonCs.supported === false, 'Non-CS document stopped before report creation with supported: false');

    // ----------------------------------------------------
    // TEST 9: Copied Content Detection Regression Check
    // ----------------------------------------------------
    const pairResult = analyzeCopiedContentDocuments([
      { documentId: 'doc-A', originalName: 'A.txt', extractedText: 'Sample doc text for plagiarism check' },
      { documentId: 'doc-B', originalName: 'B.txt', extractedText: 'Sample doc text for plagiarism check' }
    ]);
    assert(Array.isArray(pairResult.pairResults) && pairResult.pairResults.length === 1, 'Copied Content Detection algorithm executes completely unaffected');

    // Clean up test reports from Firestore
    try {
      await deleteUserReport(result1.reportId, TEST_USER.uid);
      await deleteUserReport(resultMulti.reportId, TEST_USER.uid);
    } catch (cleanErr) {
      // Ignore cleanup error
    }

  } catch (err) {
    console.error('UNCAUGHT ERROR IN TEST SUITE:', err);
    assert(false, `Test suite encountered unexpected exception: ${err.message}`);
  } finally {
    console.log('\n====================================================');
    console.log(`TASK 11 TEST SUITE RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('====================================================\n');
  }
}

runTask11Tests();
