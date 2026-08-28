const { validateDomain } = require('../services/errorDetection/domainValidationService');
const { getDb } = require('../config/firebaseAdmin');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const knowledgeService = require('../services/knowledgeService');
const reportService = require('../services/reportService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const path = require('path');
const fs = require('fs');

async function runTask2Tests() {
  console.log('====================================================');
  console.log(' TRUSTLENS TASK 2: CS DOMAIN VALIDATION TEST        ');
  console.log('====================================================\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not initialized.');
    process.exit(1);
  }

  const testId = Date.now();
  const testStudentUid = `uid_task2_student_${testId}`;
  const testUser = { uid: testStudentUid, name: 'Task 2 Test Student', email: `task2_student_${testId}@trustlens.edu`, role: 'student' };
  
  let createdKsId = null;
  let createdReportId = null;

  try {
    // ----------------------------------------------------
    // PREPARATION: Knowledge Source
    // ----------------------------------------------------
    const ks = await knowledgeService.createTextKnowledgeSource('admin_test', {
      title: `Task 2 Reference Source ${testId}`,
      category: 'Cloud Computing',
      text: 'Cloud computing provides virtual machines, containers, and cloud infrastructure for scalable execution.',
    });
    createdKsId = ks.id;


    // ----------------------------------------------------
    // TEST 1: CLOUD COMPUTING DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 1: CLOUD COMPUTING DOCUMENT (ACCEPTED)');
    const cloudText = 'Cloud computing relies on virtual machines, containers, Docker, and Kubernetes for modern cloud infrastructure.';
    const res1 = validateDomain(cloudText);
    if (!res1.supported || res1.detectedDomain !== 'Computer Science') {
      throw new Error(`Cloud computing document was incorrectly rejected: ${JSON.stringify(res1)}`);
    }
    console.log(`  [T1] Accepted: domain="${res1.detectedDomain}", confidence=${res1.confidence}, matches=${res1.evidence.totalMatches}\n`);


    // ----------------------------------------------------
    // TEST 2: DBMS DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 2: DBMS DOCUMENT (ACCEPTED)');
    const dbmsText = 'Database management systems use SQL queries, normalization, transactions, and ACID properties to manage relational tables.';
    const res2 = validateDomain(dbmsText);
    if (!res2.supported || res2.detectedDomain !== 'Computer Science') {
      throw new Error(`DBMS document was incorrectly rejected: ${JSON.stringify(res2)}`);
    }
    console.log(`  [T2] Accepted: domain="${res2.detectedDomain}", confidence=${res2.confidence}, matches=${res2.evidence.totalMatches}\n`);


    // ----------------------------------------------------
    // TEST 3: COMPUTER NETWORKS DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 3: COMPUTER NETWORKS DOCUMENT (ACCEPTED)');
    const netText = 'Computer networks transmit data packets using TCP, UDP, IP routing protocols, and firewalls.';
    const res3 = validateDomain(netText);
    if (!res3.supported || res3.detectedDomain !== 'Computer Science') {
      throw new Error(`Networks document was incorrectly rejected: ${JSON.stringify(res3)}`);
    }
    console.log(`  [T3] Accepted: domain="${res3.detectedDomain}", confidence=${res3.confidence}, matches=${res3.evidence.totalMatches}\n`);


    // ----------------------------------------------------
    // TEST 4: OPERATING SYSTEMS DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 4: OPERATING SYSTEMS DOCUMENT (ACCEPTED)');
    const osText = 'Operating systems manage processes, threads, kernel scheduling, and virtual memory management.';
    const res4 = validateDomain(osText);
    if (!res4.supported || res4.detectedDomain !== 'Computer Science') {
      throw new Error(`OS document was incorrectly rejected: ${JSON.stringify(res4)}`);
    }
    console.log(`  [T4] Accepted: domain="${res4.detectedDomain}", confidence=${res4.confidence}, matches=${res4.evidence.totalMatches}\n`);


    // ----------------------------------------------------
    // TEST 5: UNRELATED DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 5: UNRELATED DOCUMENT (REJECTED)');
    const historyText = 'The Renaissance was a fervent period of European cultural, artistic, political and economic rebirth following the Middle Ages.';
    const res5 = validateDomain(historyText);
    if (res5.supported) {
      throw new Error(`History document was incorrectly accepted as Computer Science: ${JSON.stringify(res5)}`);
    }
    console.log(`  [T5] Correctly rejected: supported=${res5.supported}, message="${res5.message}"\n`);


    // ----------------------------------------------------
    // TEST 6: GENERIC KEYWORD FALSE POSITIVE
    // ----------------------------------------------------
    console.log('▶ TEST 6: GENERIC KEYWORD FALSE POSITIVE (REJECTED)');
    const genericText = 'Our company established a global logistics network to streamline business delivery operations across all branches.';
    const res6 = validateDomain(genericText);
    if (res6.supported) {
      throw new Error(`Generic business document was incorrectly accepted due to word "network": ${JSON.stringify(res6)}`);
    }
    console.log(`  [T6] Correctly prevented false positive for isolated generic word "network"\n`);


    // ----------------------------------------------------
    // TEST 7: EMPTY DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 7: EMPTY DOCUMENT (CONTENT ERROR)');
    const res7 = validateDomain('');
    if (res7.supported || !res7.isContentError) {
      throw new Error(`Empty document should return content error: ${JSON.stringify(res7)}`);
    }
    console.log(`  [T7] Correctly handled empty text as content error: "${res7.message}"\n`);


    // ----------------------------------------------------
    // TEST 8: VERY SHORT TEXT
    // ----------------------------------------------------
    console.log('▶ TEST 8: VERY SHORT TEXT (CONTENT ERROR)');
    const res8 = validateDomain('Short text.');
    if (res8.supported || !res8.isContentError) {
      throw new Error(`Very short text should return content error: ${JSON.stringify(res8)}`);
    }
    console.log(`  [T8] Correctly handled short text as content error: "${res8.message}"\n`);


    // ----------------------------------------------------
    // TEST 9 & 11: EXISTING ERROR DETECTION & REPORT GENERATION
    // ----------------------------------------------------
    console.log('▶ TEST 9 & 11: SUPPORTED CS ERROR DETECTION PIPELINE');
    const tmpCsPath = path.join(__dirname, `tmp_cs_valid_${testId}.txt`);
    fs.writeFileSync(tmpCsPath, 'Cloud computing provides virtual machines, containers, and cloud infrastructure for execution.');
    
    const sessionCs = registerUpload(testStudentUid, 'error-detection', [{ uploadPath: tmpCsPath, originalName: `SupportedDoc_${testId}.txt`, mimeType: 'text/plain' }]);
    const analysisRes = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionCs.uploadId);
    
    if (!analysisRes.success || !analysisRes.reportId) throw new Error(`Supported document error detection pipeline failed! Result: ${JSON.stringify(analysisRes)}`);
    createdReportId = analysisRes.reportId;

    const reportSnap = await db.collection('reports').doc(createdReportId).get();
    if (!reportSnap.exists) throw new Error('Report document was not saved in Firestore!');
    console.log(`  [T9 & T11] Supported document passed validation and created report ID: ${createdReportId}\n`);
    fs.unlinkSync(tmpCsPath);


    // ----------------------------------------------------
    // TEST 12: UNSUPPORTED DOCUMENT NO REPORT CREATION
    // ----------------------------------------------------
    console.log('▶ TEST 12: UNSUPPORTED DOCUMENT NO REPORT CREATION');
    const tmpMedPath = path.join(__dirname, `tmp_med_${testId}.txt`);
    fs.writeFileSync(tmpMedPath, 'Patient showed symptoms of acute cardiovascular disease requiring surgical intervention.');
    
    const sessionMed = registerUpload(testStudentUid, 'error-detection', [{ uploadPath: tmpMedPath, originalName: `MedicalDoc_${testId}.txt`, mimeType: 'text/plain' }]);
    const unsuppRes = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionMed.uploadId);
    
    if (unsuppRes.supported !== false || unsuppRes.reportId) {
      throw new Error('Unsupported document incorrectly completed analysis or returned report ID!');
    }
    console.log('  [T12] Verified unsupported document stopped analysis and did NOT create any report\n');
    fs.unlinkSync(tmpMedPath);


    // ----------------------------------------------------
    // TEST 10: COPIED CONTENT DETECTION UNAFFECTED
    // ----------------------------------------------------
    console.log('▶ TEST 10: COPIED CONTENT DETECTION UNAFFECTED');
    const cc1Path = path.join(__dirname, `cc1_${testId}.txt`);
    const cc2Path = path.join(__dirname, `cc2_${testId}.txt`);
    fs.writeFileSync(cc1Path, 'The Renaissance period was marked by massive cultural advancements in Europe.');
    fs.writeFileSync(cc2Path, 'The Renaissance era was marked by major cultural advancements in Europe.');

    const sessionCc = registerUpload(testStudentUid, 'copied-content', [
      { uploadPath: cc1Path, originalName: `CC1_${testId}.txt`, mimeType: 'text/plain' },
      { uploadPath: cc2Path, originalName: `CC2_${testId}.txt`, mimeType: 'text/plain' },
    ]);

    const ccResult = await copiedContentService.analyzeCopiedContent(testUser, sessionCc.uploadId);
    if (!ccResult || !ccResult.reportId) throw new Error('Copied Content Detection failed!');
    console.log(`  [T10] Copied Content Detection executed unaffected. Report ID: ${ccResult.reportId}\n`);
    
    fs.unlinkSync(cc1Path);
    fs.unlinkSync(cc2Path);

    console.log('====================================================');
    console.log(' 🎉 ALL TASK 2 DOMAIN VALIDATION TESTS PASSED!       ');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ TASK 2 TEST FAILURE:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (createdKsId) await db.collection('knowledgeSources').doc(createdKsId).delete().catch(() => {});
    if (createdReportId) await db.collection('reports').doc(createdReportId).delete().catch(() => {});
  }
}

runTask2Tests().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
