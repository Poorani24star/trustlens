const { detectTopics } = require('../services/errorDetection/topicDetectionService');
const { getDb } = require('../config/firebaseAdmin');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const knowledgeService = require('../services/knowledgeService');
const reportService = require('../services/reportService');
const adminService = require('../services/adminService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const path = require('path');
const fs = require('fs');

async function runTask3Tests() {
  console.log('====================================================');
  console.log(' TRUSTLENS TASK 3: CS TOPIC DETECTION TEST          ');
  console.log('====================================================\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not initialized.');
    process.exit(1);
  }

  const testId = Date.now();
  const testStudentUid = `uid_task3_student_${testId}`;
  const testUser = { uid: testStudentUid, name: 'Task 3 Test Student', email: `task3_student_${testId}@trustlens.edu`, role: 'student' };
  
  let createdKsId = null;
  let createdReportId = null;
  let legacyReportId = null;

  try {
    // ----------------------------------------------------
    // PREPARATION: Reference Knowledge Source
    // ----------------------------------------------------
    const ks = await knowledgeService.createTextKnowledgeSource('admin_test', {
      title: `Task 3 Reference Source ${testId}`,
      category: 'Cloud Computing',
      text: 'Cloud computing provides virtual machines, containers, and cloud infrastructure for execution.',
    });
    createdKsId = ks.id;


    // ----------------------------------------------------
    // TEST 1: CLOUD COMPUTING
    // ----------------------------------------------------
    console.log('▶ TEST 1: CLOUD COMPUTING TOPIC DETECTION');
    const cloudText = 'Cloud computing relies on virtual machines, containers, Docker, and Kubernetes for scalable cloud infrastructure.';
    const res1 = detectTopics(cloudText);
    if (res1.primaryTopic !== 'Cloud Computing') {
      throw new Error(`Cloud Computing test failed! Expected "Cloud Computing", got "${res1.primaryTopic}"`);
    }
    console.log(`  [T1] Primary Topic: "${res1.primaryTopic}" (Detected: ${res1.detectedTopics.join(', ')})\n`);


    // ----------------------------------------------------
    // TEST 2: DATABASE MANAGEMENT SYSTEMS
    // ----------------------------------------------------
    console.log('▶ TEST 2: DBMS TOPIC DETECTION');
    const dbmsText = 'Relational database systems use SQL queries, normalization, transactions, and ACID properties to organize tables.';
    const res2 = detectTopics(dbmsText);
    if (res2.primaryTopic !== 'Database Management Systems') {
      throw new Error(`DBMS test failed! Expected "Database Management Systems", got "${res2.primaryTopic}"`);
    }
    console.log(`  [T2] Primary Topic: "${res2.primaryTopic}" (Detected: ${res2.detectedTopics.join(', ')})\n`);


    // ----------------------------------------------------
    // TEST 3: COMPUTER NETWORKS
    // ----------------------------------------------------
    console.log('▶ TEST 3: COMPUTER NETWORKS TOPIC DETECTION');
    const netText = 'Computer networks transmit data packets using TCP, UDP, IP routing protocols, and DNS resolution.';
    const res3 = detectTopics(netText);
    if (res3.primaryTopic !== 'Computer Networks') {
      throw new Error(`Networks test failed! Expected "Computer Networks", got "${res3.primaryTopic}"`);
    }
    console.log(`  [T3] Primary Topic: "${res3.primaryTopic}" (Detected: ${res3.detectedTopics.join(', ')})\n`);


    // ----------------------------------------------------
    // TEST 4: OPERATING SYSTEMS
    // ----------------------------------------------------
    console.log('▶ TEST 4: OPERATING SYSTEMS TOPIC DETECTION');
    const osText = 'Operating systems manage processes, threads, kernel scheduling, deadlocks, and virtual memory paging.';
    const res4 = detectTopics(osText);
    if (res4.primaryTopic !== 'Operating Systems') {
      throw new Error(`OS test failed! Expected "Operating Systems", got "${res4.primaryTopic}"`);
    }
    console.log(`  [T4] Primary Topic: "${res4.primaryTopic}" (Detected: ${res4.detectedTopics.join(', ')})\n`);


    // ----------------------------------------------------
    // TEST 5: DATA STRUCTURES AND ALGORITHMS
    // ----------------------------------------------------
    console.log('▶ TEST 5: DATA STRUCTURES AND ALGORITHMS TOPIC DETECTION');
    const dsaText = 'Data structures include arrays, linked lists, stacks, queues, binary trees, graphs, and sorting algorithms.';
    const res5 = detectTopics(dsaText);
    if (res5.primaryTopic !== 'Data Structures and Algorithms') {
      throw new Error(`DSA test failed! Expected "Data Structures and Algorithms", got "${res5.primaryTopic}"`);
    }
    console.log(`  [T5] Primary Topic: "${res5.primaryTopic}" (Detected: ${res5.detectedTopics.join(', ')})\n`);


    // ----------------------------------------------------
    // TEST 6: MACHINE LEARNING
    // ----------------------------------------------------
    console.log('▶ TEST 6: MACHINE LEARNING TOPIC DETECTION');
    const mlText = 'Machine learning models use training datasets, classification algorithms, regression, and predictions for neural networks.';
    const res6 = detectTopics(mlText);
    if (res6.primaryTopic !== 'Machine Learning') {
      throw new Error(`ML test failed! Expected "Machine Learning", got "${res6.primaryTopic}"`);
    }
    console.log(`  [T6] Primary Topic: "${res6.primaryTopic}" (Detected: ${res6.detectedTopics.join(', ')})\n`);


    // ----------------------------------------------------
    // TEST 7: MULTI-TOPIC DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 7: MULTI-TOPIC DOCUMENT');
    const multiText = 'Cloud computing cloud infrastructure relies on virtual machines, containers, Docker, and Kubernetes while managing host operating system kernel scheduling.';
    const res7 = detectTopics(multiText);
    if (res7.primaryTopic !== 'Cloud Computing' || !res7.detectedTopics.includes('Operating Systems')) {
      throw new Error(`Multi-topic test failed! Result: ${JSON.stringify(res7)}`);
    }
    console.log(`  [T7] Primary: "${res7.primaryTopic}", Related: "${res7.detectedTopics.slice(1).join(', ')}"\n`);


    // ----------------------------------------------------
    // TEST 8: GENERIC KEYWORD REPETITION
    // ----------------------------------------------------
    console.log('▶ TEST 8: GENERIC KEYWORD REPETITION HANDLING');
    const genericRepeatText = 'system system system system model model process process network network';
    const res8 = detectTopics(genericRepeatText);
    if (res8.primaryTopic !== 'General Computer Science' && res8.detectedTopics.length > 0) {
      throw new Error(`Generic repetition failed! Generic words forced a specific topic: ${JSON.stringify(res8)}`);
    }
    console.log(`  [T8] Correctly handled generic term repetition (Primary: "${res8.primaryTopic}")\n`);


    // ----------------------------------------------------
    // TEST 9: GENERAL COMPUTER SCIENCE FALLBACK
    // ----------------------------------------------------
    console.log('▶ TEST 9: GENERAL COMPUTER SCIENCE FALLBACK');
    const generalText = 'Computer science principles govern modern electronic computing devices and technical software applications.';
    const res9 = detectTopics(generalText);
    if (res9.primaryTopic !== 'General Computer Science') {
      throw new Error(`Fallback test failed! Expected "General Computer Science", got "${res9.primaryTopic}"`);
    }
    console.log(`  [T9] Safe fallback triggered: "${res9.primaryTopic}"\n`);


    // ----------------------------------------------------
    // TEST 10: REPORT STORAGE WITH TOPIC METADATA
    // ----------------------------------------------------
    console.log('▶ TEST 10: REPORT STORAGE WITH TOPIC METADATA');
    const tmpCsPath = path.join(__dirname, `tmp_cs_topic_${testId}.txt`);
    fs.writeFileSync(tmpCsPath, 'Cloud computing provides virtual machines, containers, and cloud infrastructure for execution.');
    
    const sessionCs = registerUpload(testStudentUid, 'error-detection', [{ uploadPath: tmpCsPath, originalName: `TopicDoc_${testId}.txt`, mimeType: 'text/plain' }]);
    const analysisRes = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionCs.uploadId);
    
    if (!analysisRes.success || !analysisRes.reportId) throw new Error('Error detection pipeline failed!');
    createdReportId = analysisRes.reportId;

    const reportSnap = await db.collection('reports').doc(createdReportId).get();
    const reportData = reportSnap.data();

    if (!reportData || reportData.domain !== 'Computer Science' || !reportData.primaryTopic || !Array.isArray(reportData.detectedTopics)) {
      throw new Error(`Report document missing expected domain/topic metadata: ${JSON.stringify(reportData)}`);
    }
    console.log(`  [T10] Report ID ${createdReportId} stored domain="${reportData.domain}", primaryTopic="${reportData.primaryTopic}", topics=[${reportData.detectedTopics.join(', ')}]\n`);
    fs.unlinkSync(tmpCsPath);


    // ----------------------------------------------------
    // TEST 11: OLD REPORT COMPATIBILITY
    // ----------------------------------------------------
    console.log('▶ TEST 11: OLD REPORT COMPATIBILITY');
    const legacyDocRef = db.collection('reports').doc();
    legacyReportId = legacyDocRef.id;
    await legacyDocRef.set({
      userId: testStudentUid,
      reportType: 'error-detection',
      title: 'Legacy Report Without Topic Metadata',
      status: 'completed',
      createdAt: new Date(),
    });

    const userReports = await reportService.listUserReports(testStudentUid);
    const retrievedLegacy = userReports.reports.find(r => r.id === legacyReportId);
    if (!retrievedLegacy) throw new Error('Legacy report failed to load!');
    console.log('  [T11] Legacy report loaded safely without crash\n');


    // ----------------------------------------------------
    // TEST 12: ADMIN REPORT METADATA HANDLING
    // ----------------------------------------------------
    console.log('▶ TEST 12: ADMIN REPORT METADATA HANDLING');
    const adminDetails = await adminService.getReportDetailsAdmin(createdReportId);
    if (!adminDetails || adminDetails.primaryTopic !== reportData.primaryTopic) {
      throw new Error('Admin details failed to retrieve primaryTopic!');
    }
    console.log(`  [T12] Admin report details safely retrieved primaryTopic="${adminDetails.primaryTopic}"\n`);


    // ----------------------------------------------------
    // TEST 13: COPIED CONTENT DETECTION UNAFFECTED
    // ----------------------------------------------------
    console.log('▶ TEST 13: COPIED CONTENT DETECTION UNAFFECTED');
    const cc1Path = path.join(__dirname, `cc1_${testId}.txt`);
    const cc2Path = path.join(__dirname, `cc2_${testId}.txt`);
    fs.writeFileSync(cc1Path, 'Data structures organize and store data for efficient access and modification.');
    fs.writeFileSync(cc2Path, 'Data structures store and organize data for efficient access and modification.');

    const sessionCc = registerUpload(testStudentUid, 'copied-content', [
      { uploadPath: cc1Path, originalName: `CC1_${testId}.txt`, mimeType: 'text/plain' },
      { uploadPath: cc2Path, originalName: `CC2_${testId}.txt`, mimeType: 'text/plain' },
    ]);

    const ccResult = await copiedContentService.analyzeCopiedContent(testUser, sessionCc.uploadId);
    if (!ccResult || !ccResult.reportId) throw new Error('Copied Content Detection failed!');
    console.log(`  [T13] Copied Content Detection executed unaffected. Report ID: ${ccResult.reportId}\n`);
    
    fs.unlinkSync(cc1Path);
    fs.unlinkSync(cc2Path);

    console.log('====================================================');
    console.log(' 🎉 ALL TASK 3 TOPIC DETECTION TESTS PASSED!        ');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ TASK 3 TEST FAILURE:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (createdKsId) await db.collection('knowledgeSources').doc(createdKsId).delete().catch(() => {});
    if (createdReportId) await db.collection('reports').doc(createdReportId).delete().catch(() => {});
    if (legacyReportId) await db.collection('reports').doc(legacyReportId).delete().catch(() => {});
  }
}

runTask3Tests().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
