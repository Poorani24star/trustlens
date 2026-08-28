const {
  SUPPORTED_DOMAIN,
  SUPPORTED_TOPICS,
  TOPIC_KEYWORDS,
  getSupportedDomain,
  getSupportedTopics,
  isSupportedTopic,
  getTopicKeywords,
} = require('../constants/domainConstants');

const { getDb } = require('../config/firebaseAdmin');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const knowledgeService = require('../services/knowledgeService');
const reportService = require('../services/reportService');
const adminService = require('../services/adminService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const path = require('path');
const fs = require('fs');

async function runTask1Tests() {
  console.log('====================================================');
  console.log(' TRUSTLENS TASK 1: CS DOMAIN CONFIGURATION TEST     ');
  console.log('====================================================\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not initialized.');
    process.exit(1);
  }

  const testId = Date.now();
  const testStudentUid = `uid_task1_student_${testId}`;
  const testUser = { uid: testStudentUid, name: 'Task 1 Test Student', email: `task1_student_${testId}@trustlens.edu`, role: 'student' };
  
  let createdKsId = null;
  let createdReportId = null;
  let legacyReportId = null;

  try {
    // ----------------------------------------------------
    // TEST 1: DOMAIN CONSTANT
    // ----------------------------------------------------
    console.log('▶ TEST 1: DOMAIN CONSTANTS VERIFICATION');
    if (SUPPORTED_DOMAIN !== 'Computer Science') {
      throw new Error(`SUPPORTED_DOMAIN constant mismatch: expected "Computer Science", got "${SUPPORTED_DOMAIN}"`);
    }
    if (getSupportedDomain() !== 'Computer Science') {
      throw new Error(`getSupportedDomain() helper mismatch: expected "Computer Science", got "${getSupportedDomain()}"`);
    }
    console.log(`  [T1] SUPPORTED_DOMAIN correctly configured: "${getSupportedDomain()}"\n`);


    // ----------------------------------------------------
    // TEST 2: SUPPORTED TOPICS
    // ----------------------------------------------------
    console.log('▶ TEST 2: SUPPORTED TOPICS LIST VERIFICATION');
    const requiredTopics = [
      'Data Structures and Algorithms',
      'Database Management Systems',
      'Operating Systems',
      'Computer Networks',
      'Cloud Computing',
      'Artificial Intelligence',
      'Machine Learning',
      'Data Mining',
      'Software Engineering',
      'Web Technologies',
      'Programming Languages',
      'Cybersecurity',
      'Computer Architecture',
      'Distributed Systems',
    ];

    const topicsList = getSupportedTopics();
    for (const reqTopic of requiredTopics) {
      if (!topicsList.includes(reqTopic)) {
        throw new Error(`Required topic "${reqTopic}" is missing from SUPPORTED_TOPICS configuration!`);
      }
    }
    console.log(`  [T2] All ${requiredTopics.length} required Computer Science topics are present and verified\n`);


    // ----------------------------------------------------
    // TEST 3: TOPIC KEYWORDS
    // ----------------------------------------------------
    console.log('▶ TEST 3: TOPIC KEYWORD MAPPING VERIFICATION');
    for (const topic of requiredTopics) {
      const keywords = getTopicKeywords(topic);
      if (!Array.isArray(keywords) || keywords.length === 0) {
        throw new Error(`Topic "${topic}" has missing or empty keyword mapping!`);
      }
    }
    console.log(`  [T3] Topic keyword mappings verified for all ${requiredTopics.length} topics\n`);


    // ----------------------------------------------------
    // TEST 4: REUSABILITY & HELPERS
    // ----------------------------------------------------
    console.log('▶ TEST 4: DOMAIN DATA STRUCTURE HELPERS');
    if (!isSupportedTopic('Cloud Computing')) throw new Error('isSupportedTopic("Cloud Computing") returned false!');
    if (!isSupportedTopic('Database Management Systems')) throw new Error('isSupportedTopic("Database Management Systems") returned false!');
    if (isSupportedTopic('Astronomy')) throw new Error('isSupportedTopic("Astronomy") returned true for non-CS topic!');
    
    const cloudKw = getTopicKeywords('Cloud Computing');
    if (!cloudKw.includes('docker') || !cloudKw.includes('kubernetes')) {
      throw new Error('getTopicKeywords("Cloud Computing") missing expected keywords');
    }
    console.log('  [T4] Reusable domain helpers (isSupportedTopic, getTopicKeywords) functioning correctly\n');


    // ----------------------------------------------------
    // TEST 5: EXISTING ERROR DETECTION WORKFLOW
    // ----------------------------------------------------
    console.log('▶ TEST 5: EXISTING ERROR DETECTION WORKFLOW');
    const ks = await knowledgeService.createTextKnowledgeSource('admin_test', {
      title: `Task 1 E2E Reference Source ${testId}`,
      category: 'Cloud Computing',
      text: 'Cloud computing provides virtual machines, containers, and cloud infrastructure for scalable processing.',
    });
    createdKsId = ks.id;

    const tmpDocPath = path.join(__dirname, `tmp_task1_${testId}.txt`);
    fs.writeFileSync(tmpDocPath, 'Cloud computing provides virtual machines and containers for processing.');
    
    const session = registerUpload(testStudentUid, 'error-detection', [{ uploadPath: tmpDocPath, originalName: `Task1Doc_${testId}.txt`, mimeType: 'text/plain' }]);
    const analysisRes = await errorDetectionService.analyzeErrorDetectionDocument(testUser, session.uploadId);
    
    if (!analysisRes.success || !analysisRes.reportId) throw new Error('Existing error detection analysis failed!');
    createdReportId = analysisRes.reportId;
    console.log(`  [T5] Existing Error Detection workflow executed successfully. Report ID: ${createdReportId}\n`);
    fs.unlinkSync(tmpDocPath);


    // ----------------------------------------------------
    // TEST 6: EXISTING REPORTS & BACKWARD COMPATIBILITY
    // ----------------------------------------------------
    console.log('▶ TEST 6: EXISTING REPORTS BACKWARD COMPATIBILITY');
    const legacyDocRef = db.collection('reports').doc();
    legacyReportId = legacyDocRef.id;
    await legacyDocRef.set({
      userId: testStudentUid,
      reportType: 'error-detection',
      title: 'Legacy Report Without Domain Metadata',
      status: 'completed',
      summary: { totalStatements: 3, verified: 3 },
      createdAt: new Date(),
    });

    const userReports = await reportService.listUserReports(testStudentUid);
    const retrievedLegacyRep = userReports.reports.find(r => r.id === legacyReportId);
    if (!retrievedLegacyRep) throw new Error('Legacy report without domain metadata failed to load');
    console.log('  [T6] Legacy report loaded safely without crash. Fallback domain check passed\n');


    // ----------------------------------------------------
    // TEST 7: ADMIN REPORTS COMPATIBILITY
    // ----------------------------------------------------
    console.log('▶ TEST 7: ADMIN REPORTS COMPATIBILITY');
    const adminLegacyDetails = await adminService.getReportDetailsAdmin(legacyReportId);
    if (!adminLegacyDetails || adminLegacyDetails.id !== legacyReportId) throw new Error('Admin details failed for legacy report');
    console.log('  [T7] Admin report details retrieved legacy report safely\n');


    // ----------------------------------------------------
    // TEST 8: KNOWLEDGE SOURCE MANAGEMENT
    // ----------------------------------------------------
    console.log('▶ TEST 8: KNOWLEDGE SOURCE MANAGEMENT COMPATIBILITY');
    const sourcesList = await knowledgeService.listKnowledgeSources({ status: 'active' });
    if (!sourcesList || !Array.isArray(sourcesList)) throw new Error('Failed to list knowledge sources');
    console.log(`  [T8] Knowledge sources list retrieved successfully (${sourcesList.length} active sources)\n`);


    // ----------------------------------------------------
    // TEST 9: COPIED CONTENT DETECTION UNAFFECTED
    // ----------------------------------------------------
    console.log('▶ TEST 9: COPIED CONTENT DETECTION MODULE');
    const cc1Path = path.join(__dirname, `cc1_${testId}.txt`);
    const cc2Path = path.join(__dirname, `cc2_${testId}.txt`);
    fs.writeFileSync(cc1Path, 'Operating systems manage computer hardware and application software resources.');
    fs.writeFileSync(cc2Path, 'Operating systems manage hardware and application software resources efficiently.');

    const sessionCc = registerUpload(testStudentUid, 'copied-content', [
      { uploadPath: cc1Path, originalName: `CC1_${testId}.txt`, mimeType: 'text/plain' },
      { uploadPath: cc2Path, originalName: `CC2_${testId}.txt`, mimeType: 'text/plain' },
    ]);

    const ccResult = await copiedContentService.analyzeCopiedContent(testUser, sessionCc.uploadId);
    if (!ccResult || !ccResult.reportId) throw new Error('Copied content detection failed!');
    console.log(`  [T9] Copied Content Detection algorithm executed unaffected. Report ID: ${ccResult.reportId}\n`);
    
    fs.unlinkSync(cc1Path);
    fs.unlinkSync(cc2Path);

    console.log('====================================================');
    console.log(' 🎉 ALL TASK 1 DOMAIN CONFIGURATION TESTS PASSED!   ');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ TASK 1 TEST FAILURE:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (createdKsId) await db.collection('knowledgeSources').doc(createdKsId).delete().catch(() => {});
    if (createdReportId) await db.collection('reports').doc(createdReportId).delete().catch(() => {});
    if (legacyReportId) await db.collection('reports').doc(legacyReportId).delete().catch(() => {});
  }
}

runTask1Tests().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
