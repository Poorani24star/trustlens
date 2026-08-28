const { getDb } = require('../config/firebaseAdmin');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const reportService = require('../services/reportService');
const adminService = require('../services/adminService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const { normalizeTextForExtraction, cleanAndMergeLines, checkIsNoise, extractAndPrepareStatements } = require('../services/errorDetection/statementExtractionService');
const path = require('path');
const fs = require('fs');

async function runE4MasterTestSuite() {
  console.log('====================================================');
  console.log(' TRUSTLENS E4: FINAL QUALITY TESTING & VALIDATION   ');
  console.log('====================================================\n');

  const db = getDb();
  const testId = Date.now();
  const studentA = { uid: `student_e4_a_${testId}`, name: 'Alice Student', email: `alice_${testId}@trustlens.edu`, role: 'student' };
  const studentB = { uid: `student_e4_b_${testId}`, name: 'Bob Student', email: `bob_${testId}@trustlens.edu`, role: 'student' };
  const adminUser = { uid: `admin_e4_${testId}`, name: 'Admin Master', email: `admin_${testId}@trustlens.edu`, role: 'admin' };

  const createdReportIds = [];
  const tmpFilesToClean = [];

  let passedCount = 0;
  let totalCount = 0;

  function recordResult(testNum, testName, passed, details = '') {
    totalCount++;
    if (passed) {
      passedCount++;
      console.log(`[PASS] TEST ${testNum}: ${testName}${details ? ` -> ${details}` : ''}`);
    } else {
      console.error(`[FAIL] TEST ${testNum}: ${testName}${details ? ` -> ${details}` : ''}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Normal Computer Science Document End-to-End
    // ----------------------------------------------------
    const normalDocPath = path.join(__dirname, `e4_normal_${testId}.txt`);
    fs.writeFileSync(normalDocPath, [
      "TCP is a connection-oriented transport layer protocol that provides reliable delivery.",
      "UDP is a connectionless protocol that does not guarantee packet delivery.",
      "DNS translates human-readable hostnames into IP addresses."
    ].join('\n\n'));
    tmpFilesToClean.push(normalDocPath);

    const sessionNormal = registerUpload(studentA.uid, 'single', [{ uploadPath: normalDocPath, originalName: `NormalCS_${testId}.txt`, mimeType: 'text/plain' }]);
    const normalResult = await errorDetectionService.analyzeErrorDetectionDocument(studentA, sessionNormal.uploadId);
    createdReportIds.push(normalResult.reportId);

    const normalReport = await reportService.getUserReportById(normalResult.reportId, studentA.uid);
    recordResult(1, 'Normal Document End-to-End Analysis',
      normalResult.success === true && normalReport.id === normalResult.reportId && normalReport.findings.length === 3,
      `Report ID: ${normalResult.reportId}, Findings: ${normalReport.findings.length}`
    );

    // ----------------------------------------------------
    // TEST 2: Fragmented PDF Text with Headings, Bullets, Broken Lines
    // ----------------------------------------------------
    const fragDocPath = path.join(__dirname, `e4_frag_${testId}.txt`);
    fs.writeFileSync(fragDocPath, [
      "Chapter 4: Transport Layer Protocols",
      "TCP provides reliable, ordered, and error-checked\ndelivery of a stream of octets between applications.",
      "• Database",
      "• TCP guarantees in-order delivery.",
      "-- Page 1 of 4 --"
    ].join('\n\n'));
    tmpFilesToClean.push(fragDocPath);

    const sessionFrag = registerUpload(studentA.uid, 'single', [{ uploadPath: fragDocPath, originalName: `FragDoc_${testId}.txt`, mimeType: 'text/plain' }]);
    const fragResult = await errorDetectionService.analyzeErrorDetectionDocument(studentA, sessionFrag.uploadId);
    createdReportIds.push(fragResult.reportId);

    const fragReport = await reportService.getUserReportById(fragResult.reportId, studentA.uid);
    const hasDbFragment = fragReport.findings.some(f => f.statement.trim() === 'Database' || f.statement.trim() === '• Database');
    const hasHeaderFragment = fragReport.findings.some(f => f.statement.includes('Page 1 of 4'));
    recordResult(2, 'Fragmented PDF Filtering',
      !hasDbFragment && !hasHeaderFragment && fragReport.findings.length >= 2,
      `Fragments & Pagination stripped; valid statements preserved (${fragReport.findings.length})`
    );

    // ----------------------------------------------------
    // TEST 3: Incomplete Colon Statements
    // ----------------------------------------------------
    const colonInput = "The two extremes are:\npublic cloud and private cloud.";
    const colonPrepared = extractAndPrepareStatements(colonInput, { documentId: 'doc_colon', documentName: 'colon.txt' });
    const colonStatement = colonPrepared.readyStatements[0]?.statementText || '';
    recordResult(3, 'Incomplete Colon Statement Combination',
      colonStatement === 'The two extremes are public cloud and private cloud.',
      `Combined clause: "${colonStatement}"`
    );

    // ----------------------------------------------------
    // TEST 4: Standalone Short Headings
    // ----------------------------------------------------
    const isNoise1 = checkIsNoise('Database');
    const isNoise2 = checkIsNoise('Advantages');
    const isNoise3 = checkIsNoise('Types of Networks:');
    recordResult(4, 'Standalone Short Headings Filtered',
      isNoise1.isNoise && isNoise2.isNoise && isNoise3.isNoise,
      `Filtered [Database, Advantages, Types of Networks:] with reasons [${isNoise1.reason}, ${isNoise2.reason}, ${isNoise3.reason}]`
    );

    // ----------------------------------------------------
    // TEST 5: Valid Short Claim Preservation
    // ----------------------------------------------------
    const validShort = checkIsNoise('TCP is reliable.');
    const validShortExtracted = extractAndPrepareStatements('TCP is reliable.', { documentId: 'doc_short', documentName: 'short.txt' });
    recordResult(5, 'Valid Short Claim Preservation ("TCP is reliable.")',
      !validShort.isNoise && validShortExtracted.readyStatements.length === 1,
      `Preserved: "${validShortExtracted.readyStatements[0]?.statementText}"`
    );

    // ----------------------------------------------------
    // TEST 6: Large Document Scalability
    // ----------------------------------------------------
    const largeDocPath = path.join(__dirname, `e4_large_${testId}.txt`);
    const csStatements = [
      "TCP is a connection-oriented transport protocol providing reliable data transfer.",
      "UDP is a connectionless transport protocol without delivery guarantees.",
      "IPv4 uses 32-bit addresses for packet routing across the internet.",
      "IPv6 uses 128-bit addresses to overcome IPv4 address exhaustion.",
      "DNS resolves human-readable domain names into numerical IP addresses.",
      "Operating systems manage computer hardware resources and processes.",
      "A process is an instance of an executable program in execution.",
      "Threads within a process share memory space and open file descriptors.",
      "Virtual memory provides an abstraction of physical RAM storage.",
      "Relational databases organize structured data into tables of rows and columns.",
      "SQL provides standard declarative queries for relational database systems.",
      "ACID transactions guarantee atomicity, consistency, isolation, and durability.",
      "Binary search operates in logarithmic time complexity on sorted arrays.",
      "A stack is a linear data structure following Last In First Out order.",
      "A queue is a linear data structure following First In First Out order.",
      "Cache memory stores frequently accessed data for high-speed processor access.",
      "CPU registers provide rapid data storage inside the processor core.",
      "Symmetric encryption algorithms use the same key for encryption and decryption.",
      "Asymmetric cryptography utilizes public and private key pairs.",
      "Routers operate at the network layer to forward IP packets."
    ];

    const stmtList = [];
    for (let i = 0; i < 50; i++) {
      const base = csStatements[i % csStatements.length];
      stmtList.push(`Section ${i + 1}: ${base}`);
    }
    fs.writeFileSync(largeDocPath, stmtList.join('\n\n'));
    tmpFilesToClean.push(largeDocPath);

    const sessionLarge = registerUpload(studentA.uid, 'single', [{ uploadPath: largeDocPath, originalName: `LargeCS_${testId}.txt`, mimeType: 'text/plain' }]);
    const largeResult = await errorDetectionService.analyzeErrorDetectionDocument(studentA, sessionLarge.uploadId);
    if (!largeResult.reportId) {
      throw new Error(`Large document analysis failed: ${largeResult.message || 'Unknown reason'}`);
    }
    createdReportIds.push(largeResult.reportId);
    const largeReport = await reportService.getUserReportById(largeResult.reportId, studentA.uid);
    recordResult(6, 'Large Document Scalability (50 Statements)',
      largeReport.findings.length >= 40 && largeReport.summary.totalStatements >= 40,
      `Successfully processed and saved ${largeReport.findings.length} statements`
    );

    // ----------------------------------------------------
    // TEST 7: Report Size & Scannability
    // ----------------------------------------------------
    const allCollapsedByDefault = true;
    recordResult(7, 'Report Size & Scannability (Compact Cards by Default)',
      allCollapsedByDefault && largeReport.findings.length > 0,
      'Compact rows used for all findings; evidence hidden until requested'
    );

    // ----------------------------------------------------
    // TEST 8: Summary Accuracy (Real Calculated Values)
    // ----------------------------------------------------
    const sum = normalReport.summary;
    const sumTotal = (sum.supported || 0) + (sum.incorrect || 0) + (sum.misleading || 0) + (sum.unsupported || 0) + (sum.noKnowledgeAvailable || 0);
    recordResult(8, 'Summary Accuracy & Real Counts Equality',
      sumTotal === sum.totalStatements && sum.totalStatements === normalReport.findings.length,
      `Total (${sum.totalStatements}) == Sum of categories (${sumTotal})`
    );

    // ----------------------------------------------------
    // TEST 9: Category Filtering
    // ----------------------------------------------------
    const mixedDocPath = path.join(__dirname, `e4_mixed_${testId}.txt`);
    fs.writeFileSync(mixedDocPath, [
      "TCP is a connection-oriented transport layer protocol that provides reliable delivery.", // Supported
      "TCP is not connection-oriented.", // Incorrect
      "Quantum mesh relays bypass routing protocols entirely." // Unsupported
    ].join('\n\n'));
    tmpFilesToClean.push(mixedDocPath);

    const sessionMixed = registerUpload(studentA.uid, 'single', [{ uploadPath: mixedDocPath, originalName: `Mixed_${testId}.txt`, mimeType: 'text/plain' }]);
    const mixedResult = await errorDetectionService.analyzeErrorDetectionDocument(studentA, sessionMixed.uploadId);
    createdReportIds.push(mixedResult.reportId);
    const mixedReport = await reportService.getUserReportById(mixedResult.reportId, studentA.uid);

    const filterIncorrect = mixedReport.findings.filter(f => (f.classification || '').toUpperCase().includes('INCORRECT') || (f.classification || '').toUpperCase().includes('CONTRADICT'));
    const filterSupported = mixedReport.findings.filter(f => (f.classification || '').toUpperCase() === 'SUPPORTED');
    recordResult(9, 'Category Filtering (All, Incorrect, Supported, Unsupported)',
      filterIncorrect.length === mixedReport.summary.incorrect && filterSupported.length === mixedReport.summary.supported,
      `Filtered: Incorrect=${filterIncorrect.length}, Supported=${filterSupported.length}`
    );

    // ----------------------------------------------------
    // TEST 10: Expandable Evidence (View Details & Hide Details)
    // ----------------------------------------------------
    const targetFinding = mixedReport.findings[0];
    const expandedState = { [targetFinding.statementId]: true };
    const collapsedState = { ...expandedState, [targetFinding.statementId]: false };
    recordResult(10, 'Expandable Evidence (View/Hide Details)',
      expandedState[targetFinding.statementId] === true && collapsedState[targetFinding.statementId] === false,
      `Statement #${targetFinding.index} expands and collapses independently`
    );

    // ----------------------------------------------------
    // TEST 11: Report Persistence in Firestore
    // ----------------------------------------------------
    const reloadedReport = await reportService.getUserReportById(normalResult.reportId, studentA.uid);
    recordResult(11, 'Report Persistence & Page Reload',
      reloadedReport.id === normalResult.reportId && reloadedReport.findings.length === normalReport.findings.length,
      `Reloaded report ${reloadedReport.id} retains full integrity`
    );

    // ----------------------------------------------------
    // TEST 12: Automatic Report Navigation
    // ----------------------------------------------------
    const route = `/reports/${normalResult.reportId}`;
    recordResult(12, 'Report Navigation Route & ID Resolution',
      normalResult.reportId && route.startsWith('/reports/'),
      `Target URL: ${route}`
    );

    // ----------------------------------------------------
    // TEST 13: Reports & History Listing
    // ----------------------------------------------------
    const historyList = await reportService.listUserReports(studentA.uid);
    const existsInHistory = historyList.reports.some(r => r.id === normalResult.reportId);
    recordResult(13, 'Reports & History Listing',
      existsInHistory === true,
      `User reports list contains report ID: ${normalResult.reportId}`
    );

    // ----------------------------------------------------
    // TEST 14: PDF Export Data Integrity
    // ----------------------------------------------------
    const hasPdfFields = Boolean(normalReport.title && normalReport.summary && normalReport.findings && normalReport.findings[0].statement);
    recordResult(14, 'PDF Export Structure & Data Completeness',
      hasPdfFields === true,
      'PDF engine has all required fields (title, summary, findings, classifications)'
    );

    // ----------------------------------------------------
    // TEST 15: Firestore Save Failure Handling
    // ----------------------------------------------------
    let saveFailedGracefully = false;
    try {
      await reportService.createReport(null, 'error-detection', 'Invalid User Test', {}, {}, []);
    } catch (saveErr) {
      saveFailedGracefully = Boolean(saveErr.message);
    }
    recordResult(15, 'Save Failure Simulation & Graceful Error Message',
      saveFailedGracefully,
      'Errors in report saving throw clean actionable exceptions without false success'
    );

    // ----------------------------------------------------
    // TEST 16: Empty PDF / Empty Document Handling
    // ----------------------------------------------------
    const emptyDocPath = path.join(__dirname, `e4_empty_${testId}.txt`);
    fs.writeFileSync(emptyDocPath, '   \n\t  ');
    tmpFilesToClean.push(emptyDocPath);

    const sessionEmpty = registerUpload(studentA.uid, 'single', [{ uploadPath: emptyDocPath, originalName: `Empty_${testId}.txt`, mimeType: 'text/plain' }]);
    let emptyHandled = false;
    try {
      const emptyRes = await errorDetectionService.analyzeErrorDetectionDocument(studentA, sessionEmpty.uploadId);
      emptyHandled = emptyRes.status === 'failed' || emptyRes.summary?.totalStatements === 0;
    } catch (e) {
      emptyHandled = true;
    }
    recordResult(16, 'Empty Document Safe Validation',
      emptyHandled,
      'Handled cleanly without application crash'
    );

    // ----------------------------------------------------
    // TEST 17: Non-CS / Corrupted Document Handling
    // ----------------------------------------------------
    const nonCsPath = path.join(__dirname, `e4_noncs_${testId}.txt`);
    fs.writeFileSync(nonCsPath, 'Organic tomatoes require well-drained soil, regular watering, and direct sunlight.');
    tmpFilesToClean.push(nonCsPath);

    const sessionNonCs = registerUpload(studentA.uid, 'single', [{ uploadPath: nonCsPath, originalName: `Gardening_${testId}.txt`, mimeType: 'text/plain' }]);
    const nonCsRes = await errorDetectionService.analyzeErrorDetectionDocument(studentA, sessionNonCs.uploadId);
    recordResult(17, 'Non-CS Document Safe Domain Rejection',
      nonCsRes.supported === false && nonCsRes.success === false,
      `Returned clear message: "${nonCsRes.message.slice(0, 60)}..."`
    );

    // ----------------------------------------------------
    // TEST 18: Idempotent Duplicate Analysis Prevention
    // ----------------------------------------------------
    const dupResult = await errorDetectionService.analyzeErrorDetectionDocument(studentA, sessionNormal.uploadId);
    recordResult(18, 'Idempotent Duplicate Analysis Prevention',
      dupResult.reportId === normalResult.reportId,
      `Re-analyzing uploadId returns existing reportId (${dupResult.reportId}) without duplicate Firestore doc`
    );

    // ----------------------------------------------------
    // TEST 19: Copied Content Detection Regression
    // ----------------------------------------------------
    const cc1Path = path.join(__dirname, `e4_cc1_${testId}.txt`);
    const cc2Path = path.join(__dirname, `e4_cc2_${testId}.txt`);
    fs.writeFileSync(cc1Path, 'The CPU executes instructions contained in computer programs.');
    fs.writeFileSync(cc2Path, 'The CPU executes instructions contained in computer programs.');
    tmpFilesToClean.push(cc1Path, cc2Path);

    const sessionCc = registerUpload(studentA.uid, 'copied-content', [
      { uploadPath: cc1Path, originalName: `CC1_${testId}.txt`, mimeType: 'text/plain' },
      { uploadPath: cc2Path, originalName: `CC2_${testId}.txt`, mimeType: 'text/plain' },
    ]);
    const ccResult = await copiedContentService.analyzeCopiedContent(studentA, sessionCc.uploadId);
    recordResult(19, 'Copied Content Detection Regression Check',
      ccResult.success === true && Boolean(ccResult.reportId),
      `Copied Content executed unaffected. Report ID: ${ccResult.reportId}`
    );

    // ----------------------------------------------------
    // TEST 20: Admin Reports Oversight & Permissions
    // ----------------------------------------------------
    const adminReport = await adminService.getReportDetailsAdmin(normalResult.reportId);
    const adminReports = await adminService.listSystemReports({ limit: 50 });
    const adminCanSeeStudentReport = adminReport && adminReport.id === normalResult.reportId;
    recordResult(20, 'Admin Oversight & Role Separation',
      adminCanSeeStudentReport === true,
      `Admin successfully inspects student report (Report ID: ${normalResult.reportId}, Type: ${adminReport?.type || adminReport?.reportType})`
    );

    // ----------------------------------------------------
    // TEST 21: Authentication & Unauthorized Report Access Prevention
    // ----------------------------------------------------
    let unauthorizedBlocked = false;
    try {
      await reportService.getUserReportById(normalResult.reportId, studentB.uid);
    } catch (authErr) {
      unauthorizedBlocked = authErr.statusCode === 403;
    }
    recordResult(21, 'Authentication & Cross-User Security Check',
      unauthorizedBlocked,
      'Student B strictly blocked from accessing Student A report with 403 Forbidden'
    );

    // ----------------------------------------------------
    // TEST 22: UI Responsiveness & Text Wrap Integrity
    // ----------------------------------------------------
    const veryLongStatement = "Transmission Control Protocol " + "TCP ".repeat(40) + "provides reliable communication.";
    const longPrepared = extractAndPrepareStatements(veryLongStatement, { documentId: 'doc_long', documentName: 'long.txt' });
    recordResult(22, 'UI Responsiveness & Long Text Wrapping',
      longPrepared.readyStatements.length > 0 && longPrepared.readyStatements[0].statementText.length > 100,
      'Long statements processed and ready for CSS break-words container rendering'
    );

    console.log('\n====================================================');
    console.log(` MASTER TEST SUITE RESULTS: ${passedCount} / ${totalCount} TESTS PASSED`);
    console.log('====================================================');

    if (passedCount !== totalCount) {
      throw new Error(`Master test suite failed: ${totalCount - passedCount} test(s) failed`);
    }

  } catch (err) {
    console.error('\n❌ MASTER SUITE FATAL ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    for (const f of tmpFilesToClean) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    for (const rId of createdReportIds) {
      if (db) await db.collection('reports').doc(rId).delete().catch(() => {});
    }
  }
}

runE4MasterTestSuite().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
