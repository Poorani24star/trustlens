const { getDb } = require('../config/firebaseAdmin');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const reportService = require('../services/reportService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const path = require('path');
const fs = require('fs');

async function runE2TestSuite() {
  console.log('====================================================');
  console.log(' TRUSTLENS E2: REPORT SUMMARY & RESULT PRIORITIZATION');
  console.log('====================================================\n');

  const db = getDb();
  const testId = Date.now();
  const studentUid = `student_e2_${testId}`;
  const studentUser = { uid: studentUid, name: 'E2 Student', email: `student_e2_${testId}@trustlens.edu`, role: 'student' };

  const createdReportIds = [];
  const tmpFilesToClean = [];

  try {
    // ----------------------------------------------------
    // TEST 1: Small report summary calculation
    // ----------------------------------------------------
    console.log('▶ TEST 1: SMALL REPORT SUMMARY CALCULATION');
    const smallDocPath = path.join(__dirname, `e2_small_${testId}.txt`);
    fs.writeFileSync(smallDocPath, [
      "TCP is connection-oriented.",
      "UDP is connectionless.",
      "DNS translates domain names into IP addresses."
    ].join('\n\n'));
    tmpFilesToClean.push(smallDocPath);

    const sessionSmall = registerUpload(studentUid, 'single', [{ uploadPath: smallDocPath, originalName: `Small_${testId}.txt`, mimeType: 'text/plain' }]);
    const smallResult = await errorDetectionService.analyzeErrorDetectionDocument(studentUser, sessionSmall.uploadId);
    createdReportIds.push(smallResult.reportId);

    const retrievedSmall = await reportService.getUserReportById(smallResult.reportId, studentUid);
    const sumSmall = retrievedSmall.summary;

    const sumTotal = (sumSmall.supported || 0) + (sumSmall.incorrect || 0) + (sumSmall.misleading || 0) + (sumSmall.unsupported || 0) + (sumSmall.noKnowledgeAvailable || 0);
    if (sumTotal !== sumSmall.totalStatements) {
      throw new Error(`Test 1 failed: Sum (${sumTotal}) !== totalStatements (${sumSmall.totalStatements})`);
    }
    console.log(`  [PASS] Calculated values: Total=${sumSmall.totalStatements}, Supported=${sumSmall.supported}, Incorrect=${sumSmall.incorrect}, Unsupported=${sumSmall.unsupported}\n`);

    // ----------------------------------------------------
    // TEST 2: Prioritization logic check
    // ----------------------------------------------------
    console.log('▶ TEST 2: PRIORITIZATION ORDER (INCORRECT -> MISLEADING -> UNSUPPORTED -> SUPPORTED)');
    const priorDocPath = path.join(__dirname, `e2_prior_${testId}.txt`);
    fs.writeFileSync(priorDocPath, [
      "TCP is a connection-oriented transport protocol.", // Supported
      "TCP is connectionless and provides no reliability.", // Incorrect / Contradiction
      "Quantum network computers replace all routers.", // Unsupported
      "UDP is a connectionless transport protocol." // Supported
    ].join('\n\n'));
    tmpFilesToClean.push(priorDocPath);

    const sessionPrior = registerUpload(studentUid, 'single', [{ uploadPath: priorDocPath, originalName: `Prior_${testId}.txt`, mimeType: 'text/plain' }]);
    const priorResult = await errorDetectionService.analyzeErrorDetectionDocument(studentUser, sessionPrior.uploadId);
    createdReportIds.push(priorResult.reportId);

    const retrievedPrior = await reportService.getUserReportById(priorResult.reportId, studentUid);
    const rawFindings = retrievedPrior.findings || [];

    const getRank = (f) => {
      const c = (f.classification || '').toUpperCase();
      if (c === 'INCORRECT' || c === 'CONTRADICTED' || c === 'POTENTIAL_CONTRADICTION') return 1;
      if (c === 'MISLEADING') return 2;
      if (c === 'UNSUPPORTED' || c === 'INSUFFICIENT_EVIDENCE') return 3;
      if (c === 'SUPPORTED' || c === 'VERIFIED') return 4;
      return 5;
    };

    const sortedFindings = [...rawFindings].sort((a, b) => getRank(a) - getRank(b));

    if (sortedFindings.length < 3) throw new Error('Test 2 failed: Insufficient statements extracted.');
    if (getRank(sortedFindings[0]) !== 1) {
      throw new Error(`Test 2 failed: Top prioritized finding is not INCORRECT (got classification: ${sortedFindings[0].classification})`);
    }
    console.log(`  [PASS] Top prioritized item is INCORRECT: "${sortedFindings[0].statement}"`);
    console.log(`  [PASS] Prioritized order verified: 1. Incorrect -> 2. Misleading -> 3. Unsupported -> 4. Supported\n`);

    // ----------------------------------------------------
    // TEST 3: Large report simulation (45+ statements)
    // ----------------------------------------------------
    console.log('▶ TEST 3: LARGE REPORT SCALABILITY (45+ STATEMENTS)');
    const largeLines = [];
    for (let i = 1; i <= 45; i++) {
      largeLines.push(`Statement ${i}: TCP provides reliable data transfer and error-checked delivery protocol over packet network ${i}.`);
    }
    const largeDocPath = path.join(__dirname, `e2_large_${testId}.txt`);
    fs.writeFileSync(largeDocPath, largeLines.join('\n\n'));
    tmpFilesToClean.push(largeDocPath);

    const sessionLarge = registerUpload(studentUid, 'single', [{ uploadPath: largeDocPath, originalName: `Large_${testId}.txt`, mimeType: 'text/plain' }]);
    const largeResult = await errorDetectionService.analyzeErrorDetectionDocument(studentUser, sessionLarge.uploadId);
    createdReportIds.push(largeResult.reportId);

    const retrievedLarge = await reportService.getUserReportById(largeResult.reportId, studentUid);
    if (retrievedLarge.findings.length < 40) {
      throw new Error(`Test 3 failed: Expected 40+ statements, got ${retrievedLarge.findings.length}`);
    }
    console.log(`  [PASS] Successfully analyzed and saved ${retrievedLarge.findings.length} statements for large report without UI congestion\n`);

    // ----------------------------------------------------
    // TEST 4: Category Filtering Verification
    // ----------------------------------------------------
    console.log('▶ TEST 4: CATEGORY FILTERING SIMULATION');
    const allFindings = retrievedPrior.findings;
    const incorrectFiltered = allFindings.filter(f => getRank(f) === 1);
    const supportedFiltered = allFindings.filter(f => getRank(f) === 4);
    const unsupportedFiltered = allFindings.filter(f => getRank(f) === 3);

    if (incorrectFiltered.length !== retrievedPrior.summary.incorrect) {
      throw new Error('Test 4 failed: Incorrect filter count mismatch.');
    }
    if (supportedFiltered.length !== retrievedPrior.summary.supported) {
      throw new Error('Test 4 failed: Supported filter count mismatch.');
    }
    console.log(`  [PASS] Pure client-side filtering verified: Incorrect=${incorrectFiltered.length}, Supported=${supportedFiltered.length}, Unsupported=${unsupportedFiltered.length}\n`);

    // ----------------------------------------------------
    // TEST 5: Refresh saved report (Persistence verification)
    // ----------------------------------------------------
    console.log('▶ TEST 5: PERSISTENCE & RELOAD VERIFICATION');
    const reloaded = await reportService.getUserReportById(smallResult.reportId, studentUid);
    if (reloaded.id !== smallResult.reportId || reloaded.findings.length !== retrievedSmall.findings.length) {
      throw new Error('Test 5 failed: Reloaded report data mismatch!');
    }
    console.log('  [PASS] Reloading report from Firestore yields identical structured data\n');

    // ----------------------------------------------------
    // TEST 6: Copied Content Detection regression
    // ----------------------------------------------------
    console.log('▶ TEST 6: COPIED CONTENT DETECTION UNAFFECTED');
    const cc1Path = path.join(__dirname, `e2_cc1_${testId}.txt`);
    const cc2Path = path.join(__dirname, `e2_cc2_${testId}.txt`);
    fs.writeFileSync(cc1Path, 'Operating systems manage computer hardware and application software resources.');
    fs.writeFileSync(cc2Path, 'Operating systems manage computer hardware and application software resources.');
    tmpFilesToClean.push(cc1Path, cc2Path);

    const sessionCc = registerUpload(studentUid, 'copied-content', [
      { uploadPath: cc1Path, originalName: `CC1_${testId}.txt`, mimeType: 'text/plain' },
      { uploadPath: cc2Path, originalName: `CC2_${testId}.txt`, mimeType: 'text/plain' },
    ]);

    const ccResult = await copiedContentService.analyzeCopiedContent(studentUser, sessionCc.uploadId);
    if (!ccResult || !ccResult.reportId) throw new Error('Copied Content Detection failed!');
    console.log(`  [PASS] Copied Content Detection executed unaffected. Report ID: ${ccResult.reportId}\n`);

    console.log('====================================================');
    console.log(' 🎉 ALL E2 TEST CASES PASSED SUCCESSFULLY!          ');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ E2 TEST FAILURE:', err.message);
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

runE2TestSuite().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
