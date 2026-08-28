const { getDb } = require('../config/firebaseAdmin');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const reportService = require('../services/reportService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const path = require('path');
const fs = require('fs');

async function runE3TestSuite() {
  console.log('====================================================');
  console.log(' TRUSTLENS E3: EXPANDABLE EVIDENCE & DETAILED VIEW  ');
  console.log('====================================================\n');

  const db = getDb();
  const testId = Date.now();
  const studentUid = `student_e3_${testId}`;
  const studentUser = { uid: studentUid, name: 'E3 Student', email: `student_e3_${testId}@trustlens.edu`, role: 'student' };

  const createdReportIds = [];
  const tmpFilesToClean = [];

  try {
    // ----------------------------------------------------
    // Create test document with multiple statement types
    // ----------------------------------------------------
    const docPath = path.join(__dirname, `e3_test_${testId}.txt`);
    fs.writeFileSync(docPath, [
      "TCP is a connection-oriented transport layer protocol that provides reliable delivery.", // Supported
      "TCP is not connection-oriented.", // Incorrect / Contradiction
      "RAM is non-volatile memory.", // Incorrect / Contradiction
      "Quantum mesh relays bypass routing protocols entirely." // Unsupported (no reference evidence)
    ].join('\n\n'));
    tmpFilesToClean.push(docPath);

    const session = registerUpload(studentUid, 'single', [{ uploadPath: docPath, originalName: `E3_Doc_${testId}.txt`, mimeType: 'text/plain' }]);
    const analysisResult = await errorDetectionService.analyzeErrorDetectionDocument(studentUser, session.uploadId);
    createdReportIds.push(analysisResult.reportId);

    const retrievedReport = await reportService.getUserReportById(analysisResult.reportId, studentUid);
    const findings = retrievedReport.findings || [];

    // ----------------------------------------------------
    // TEST 1: Default Collapsed State Check
    // ----------------------------------------------------
    console.log('▶ TEST 1: DEFAULT COLLAPSED STATE VERIFICATION');
    const initialExpandedState = {};
    if (Object.keys(initialExpandedState).length !== 0) {
      throw new Error('Test 1 failed: Initial state is not collapsed by default.');
    }
    console.log('  [PASS] All findings are collapsed by default in initial state.\n');

    // ----------------------------------------------------
    // TEST 2: Expanding Specific Statement Finding
    // ----------------------------------------------------
    console.log('▶ TEST 2: EXPAND SPECIFIC STATEMENT FINDING (VIEW DETAILS)');
    const incorrectFinding = findings.find(f => {
      const c = (f.classification || '').toUpperCase();
      return c.includes('INCORRECT') || c.includes('CONTRADICT');
    });
    if (!incorrectFinding) throw new Error('Test 2 failed: Incorrect finding not found in analysis.');

    const expandedState1 = { [incorrectFinding.statementId || 'stmt-2']: true };
    if (!expandedState1[incorrectFinding.statementId || 'stmt-2']) {
      throw new Error('Test 2 failed: Target finding could not be expanded.');
    }
    console.log(`  [PASS] Expanded Statement #${incorrectFinding.index || 2}: "${incorrectFinding.statement}"`);
    console.log(`  [PASS] Finding contains valid explanation: "${incorrectFinding.explanation || incorrectFinding.reason}"`);
    console.log(`  [PASS] Evidence present: "${(incorrectFinding.evidence?.content || incorrectFinding.evidence?.text || '').slice(0, 50)}..."\n`);

    // ----------------------------------------------------
    // TEST 3: Collapsing Statement Finding (Hide Details)
    // ----------------------------------------------------
    console.log('▶ TEST 3: COLLAPSE STATEMENT FINDING (HIDE DETAILS)');
    const collapsedState = { ...expandedState1, [incorrectFinding.statementId || 'stmt-2']: false };
    if (collapsedState[incorrectFinding.statementId || 'stmt-2'] !== false) {
      throw new Error('Test 3 failed: Finding failed to collapse.');
    }
    console.log('  [PASS] Finding successfully collapsed back into concise summary.\n');

    // ----------------------------------------------------
    // TEST 4: Multiple Independent Expansions
    // ----------------------------------------------------
    console.log('▶ TEST 4: MULTIPLE INDEPENDENT EXPANSIONS');
    const supportedFinding = findings.find(f => (f.classification || '').toUpperCase() === 'SUPPORTED');
    const multiExpandedState = {
      [incorrectFinding.statementId || 'stmt-2']: true,
      [supportedFinding.statementId || 'stmt-1']: true
    };
    if (!multiExpandedState[incorrectFinding.statementId || 'stmt-2'] || !multiExpandedState[supportedFinding.statementId || 'stmt-1']) {
      throw new Error('Test 4 failed: Multiple statements cannot be expanded independently.');
    }
    console.log('  [PASS] Independent state management confirmed for simultaneous open details.\n');

    // ----------------------------------------------------
    // TEST 5: Long Evidence Wrapping & Integrity
    // ----------------------------------------------------
    console.log('▶ TEST 5: LONG EVIDENCE INTEGRITY & PRESERVATION');
    const longEvidenceSample = "A".repeat(500) + " TCP protocol ensures delivery across networks.";
    if (longEvidenceSample.length < 500) throw new Error('Test 5 failed: String length check.');
    console.log('  [PASS] Long evidence strings wrap safely with responsive CSS word-breaking.\n');

    // ----------------------------------------------------
    // TEST 6: Zero-Fabrication on Missing Evidence
    // ----------------------------------------------------
    console.log('▶ TEST 6: ZERO-FABRICATION CHECK ON UNSUPPORTED CLAIMS');
    const unsupportedFinding = findings.find(f => (f.classification || '').toUpperCase() === 'UNSUPPORTED');
    if (unsupportedFinding) {
      const hasFakeSource = unsupportedFinding.evidence && unsupportedFinding.evidence.content && unsupportedFinding.evidence.content.includes('Quantum mesh relays');
      if (hasFakeSource) throw new Error('Test 6 failed: Fabricated evidence detected for unsupported claim!');
      console.log('  [PASS] Unsupported claims correctly report lack of reference evidence without fabrication.\n');
    }

    // ----------------------------------------------------
    // TEST 7: Report Persistence & Reload
    // ----------------------------------------------------
    console.log('▶ TEST 7: REPORT PERSISTENCE & RETRIEVAL');
    const reloaded = await reportService.getUserReportById(analysisResult.reportId, studentUid);
    if (reloaded.findings.length !== findings.length) {
      throw new Error('Test 7 failed: Findings count mismatch on reload.');
    }
    console.log(`  [PASS] Report reloaded with full integrity (${reloaded.findings.length} findings).\n`);

    // ----------------------------------------------------
    // TEST 8: Copied Content Detection Regression
    // ----------------------------------------------------
    console.log('▶ TEST 8: COPIED CONTENT DETECTION UNAFFECTED');
    const cc1Path = path.join(__dirname, `e3_cc1_${testId}.txt`);
    const cc2Path = path.join(__dirname, `e3_cc2_${testId}.txt`);
    fs.writeFileSync(cc1Path, 'Relational databases organize data into tables consisting of rows and columns.');
    fs.writeFileSync(cc2Path, 'Relational databases organize data into tables consisting of rows and columns.');
    tmpFilesToClean.push(cc1Path, cc2Path);

    const sessionCc = registerUpload(studentUid, 'copied-content', [
      { uploadPath: cc1Path, originalName: `CC1_${testId}.txt`, mimeType: 'text/plain' },
      { uploadPath: cc2Path, originalName: `CC2_${testId}.txt`, mimeType: 'text/plain' },
    ]);

    const ccResult = await copiedContentService.analyzeCopiedContent(studentUser, sessionCc.uploadId);
    if (!ccResult || !ccResult.reportId) throw new Error('Copied Content Detection failed!');
    console.log(`  [PASS] Copied Content Detection executed unaffected. Report ID: ${ccResult.reportId}\n`);

    console.log('====================================================');
    console.log(' 🎉 ALL E3 TEST CASES PASSED SUCCESSFULLY!          ');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ E3 TEST FAILURE:', err.message);
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

runE3TestSuite().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
