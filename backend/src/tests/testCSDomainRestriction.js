const { getDb } = require('../config/firebaseAdmin');
const { validateDomainAndDetectTopics } = require('../services/errorDetection/domainValidationService');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const knowledgeService = require('../services/knowledgeService');
const reportService = require('../services/reportService');
const adminService = require('../services/adminService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const path = require('path');
const fs = require('fs');

async function runCSDomainRestrictionTests() {
  console.log('====================================================');
  console.log(' TRUSTLENS COMPUTER SCIENCE DOMAIN RESTRICTION TEST ');
  console.log('====================================================\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not initialized.');
    process.exit(1);
  }

  const testId = Date.now();
  const testStudentUid = `uid_cs_student_${testId}`;
  const testUser = { uid: testStudentUid, name: 'CS Test Student', email: `cs_student_${testId}@trustlens.edu`, role: 'student' };
  
  let cloudKsId = null;
  let dbmsKsId = null;
  let createdReportId = null;
  let oldReportId = null;

  try {
    // ----------------------------------------------------
    // PREPARATION: Create active CS Knowledge Sources
    // ----------------------------------------------------
    console.log('▶ PREPARATION: Creating Computer Science Knowledge Sources');
    const cloudKs = await knowledgeService.createTextKnowledgeSource('admin_test', {
      title: `E2E Cloud Reference ${testId}`,
      category: 'Cloud Computing',
      topics: ['Cloud Computing', 'Virtualization'],
      description: 'Cloud Infrastructure and Virtual Machine Reference Source',
      text: 'Cloud computing is the on-demand availability of computer system resources, especially data storage and computing power, using virtual machines, containers, hypervisors, and cloud infrastructure without direct active management by the user.',
    });
    cloudKsId = cloudKs.id;

    const dbmsKs = await knowledgeService.createTextKnowledgeSource('admin_test', {
      title: `E2E DBMS Reference ${testId}`,
      category: 'Database Management Systems',
      topics: ['Database Management Systems', 'SQL'],
      description: 'Database Systems Reference Source',
      text: 'Database Management Systems handle structured data storage using SQL queries, relational tables, primary keys, foreign keys, normalization, transactions, and ACID properties.',
    });
    dbmsKsId = dbmsKs.id;

    console.log(`  Created Cloud KS ID: ${cloudKsId} | DBMS KS ID: ${dbmsKsId}\n`);


    // ----------------------------------------------------
    // TEST 1: CLOUD COMPUTING DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 1: CLOUD COMPUTING DOCUMENT');
    const cloudDocText = 'Cloud computing relies on virtual machines, containers, hypervisors, and auto scaling for scalable cloud infrastructure.';
    const cloudValidation = validateDomainAndDetectTopics(cloudDocText);

    if (!cloudValidation.supported) throw new Error('Cloud computing document was incorrectly rejected!');
    if (!cloudValidation.detectedTopics.includes('Cloud Computing')) throw new Error('Failed to detect Cloud Computing topic!');
    console.log(`  [T1-A] Domain accepted: "${cloudValidation.detectedDomain}"`);
    console.log(`  [T1-B] Detected topics: ${cloudValidation.detectedTopics.join(', ')}`);

    // Run end-to-end analysis on mock session
    const tmpCloudPath = path.join(__dirname, `tmp_cloud_${testId}.txt`);
    fs.writeFileSync(tmpCloudPath, cloudDocText);
    const sessionCloud = registerUpload(testStudentUid, 'error-detection', [{ uploadPath: tmpCloudPath, originalName: `CloudDoc_${testId}.txt`, mimeType: 'text/plain' }]);
    
    let res1;
    try {
      res1 = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionCloud.uploadId);
    } catch (err1) {
      console.error('  [T1-C ERR]:', err1);
      throw err1;
    }
    if (!res1.supported || !res1.reportId) throw new Error('Cloud computing error detection analysis failed!');
    createdReportId = res1.reportId;
    console.log(`  [T1-C] Error Detection completed successfully. Report ID: ${createdReportId}\n`);
    fs.unlinkSync(tmpCloudPath);


    // ----------------------------------------------------
    // TEST 2: DBMS DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 2: DBMS DOCUMENT');
    const dbmsDocText = 'A relational database management system uses SQL for querying database tables with primary key and foreign key constraints.';
    const dbmsValidation = validateDomainAndDetectTopics(dbmsDocText);

    if (!dbmsValidation.supported) throw new Error('DBMS document was incorrectly rejected!');
    if (!dbmsValidation.detectedTopics.includes('Database Management Systems')) throw new Error('Failed to detect DBMS topic!');
    console.log(`  [T2-A] Domain accepted: "${dbmsValidation.detectedDomain}"`);
    console.log(`  [T2-B] Detected topics: ${dbmsValidation.detectedTopics.join(', ')}`);

    const tmpDbmsPath = path.join(__dirname, `tmp_dbms_${testId}.txt`);
    fs.writeFileSync(tmpDbmsPath, dbmsDocText);
    const sessionDbms = registerUpload(testStudentUid, 'error-detection', [{ uploadPath: tmpDbmsPath, originalName: `DBMSDoc_${testId}.txt`, mimeType: 'text/plain' }]);
    
    const res2 = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionDbms.uploadId);
    if (!res2.supported) throw new Error('DBMS error detection analysis failed!');
    console.log('  [T2-C] DBMS Error Detection completed successfully\n');
    fs.unlinkSync(tmpDbmsPath);


    // ----------------------------------------------------
    // TEST 3: COMPUTER NETWORKS DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 3: COMPUTER NETWORKS DOCUMENT');
    const netDocText = 'Computer networks transmit data packets over TCP IP protocol routes, using routers, switches, subnets, and firewalls.';
    const netValidation = validateDomainAndDetectTopics(netDocText);

    if (!netValidation.supported) throw new Error('Networks document was incorrectly rejected!');
    if (!netValidation.detectedTopics.includes('Computer Networks')) throw new Error('Failed to detect Computer Networks topic!');
    console.log(`  [T3-A] Domain accepted: "${netValidation.detectedDomain}"`);
    console.log(`  [T3-B] Detected topics: ${netValidation.detectedTopics.join(', ')}`);

    const tmpNetPath = path.join(__dirname, `tmp_net_${testId}.txt`);
    fs.writeFileSync(tmpNetPath, netDocText);
    const sessionNet = registerUpload(testStudentUid, 'error-detection', [{ uploadPath: tmpNetPath, originalName: `NetDoc_${testId}.txt`, mimeType: 'text/plain' }]);
    
    const res3 = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionNet.uploadId);
    if (!res3.supported) throw new Error('Networks error detection analysis failed!');
    console.log('  [T3-C] Networks Error Detection completed successfully\n');
    fs.unlinkSync(tmpNetPath);


    // ----------------------------------------------------
    // TEST 4: UNSUPPORTED DOMAIN DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 4: UNSUPPORTED DOMAIN DOCUMENT (MEDICINE/CARDIOLOGY)');
    const medDocText = 'The patient presented with symptoms of severe hypertension and myocardial infarction. Clinical trials recommended cardiology evaluation and pharmaceutical intervention.';
    const medValidation = validateDomainAndDetectTopics(medDocText);

    if (medValidation.supported) throw new Error('Medical document was incorrectly accepted as Computer Science!');
    console.log(`  [T4-A] Domain correctly rejected. DetectedDomain: "${medValidation.detectedDomain}"`);
    console.log(`  [T4-B] Supported Domain Message: "${medValidation.message}"`);

    const tmpMedPath = path.join(__dirname, `tmp_med_${testId}.txt`);
    fs.writeFileSync(tmpMedPath, medDocText);
    const sessionMed = registerUpload(testStudentUid, 'error-detection', [{ uploadPath: tmpMedPath, originalName: `MedDoc_${testId}.txt`, mimeType: 'text/plain' }]);

    const res4 = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionMed.uploadId);
    if (res4.supported !== false || res4.success !== false) throw new Error('Unsupported document analysis incorrectly executed!');
    console.log('  [T4-C] Verified error detection blocked analysis and returned user-friendly message\n');
    fs.unlinkSync(tmpMedPath);


    // ----------------------------------------------------
    // TEST 5: INACTIVE KNOWLEDGE SOURCE EXCLUSION
    // ----------------------------------------------------
    console.log('▶ TEST 5: INACTIVE KNOWLEDGE SOURCE EXCLUSION');
    await knowledgeService.updateKnowledgeSourceStatus(cloudKsId, 'inactive');
    
    const activeSources = await knowledgeService.listKnowledgeSources({ status: 'active' });
    if (activeSources.some(k => k.id === cloudKsId)) throw new Error('Inactive knowledge source was returned in active query!');
    console.log('  [T5-A] Deactivated Cloud KS');
    console.log('  [T5-B] Verified inactive knowledge source is EXCLUDED from factual check active sources query\n');


    // ----------------------------------------------------
    // TEST 6: REPORT STORAGE
    // ----------------------------------------------------
    console.log('▶ TEST 6: REPORT STORAGE VERIFICATION');
    const reportSnap = await db.collection('reports').doc(createdReportId).get();
    if (!reportSnap.exists) throw new Error('Created report missing in Firestore');
    const repData = reportSnap.data();

    if (repData.domain !== 'Computer Science') throw new Error(`Report domain field invalid: expected "Computer Science", got "${repData.domain}"`);
    if (!Array.isArray(repData.detectedTopics) || !repData.detectedTopics.includes('Cloud Computing')) {
      throw new Error('Report detectedTopics missing or invalid');
    }
    console.log(`  [T6-A] Report domain verified in Firestore: "${repData.domain}"`);
    console.log(`  [T6-B] Report detectedTopics verified in Firestore: ${repData.detectedTopics.join(', ')}\n`);


    // ----------------------------------------------------
    // TEST 7: REPORTS & HISTORY VERIFICATION
    // ----------------------------------------------------
    console.log('▶ TEST 7: REPORTS & HISTORY INTEGRATION');
    const userReportsRes = await reportService.listUserReports(testStudentUid);
    if (!userReportsRes.reports.some(r => r.id === createdReportId)) throw new Error('Report not visible in User Reports history');
    console.log('  [T7] Report verified in User Reports & History listing\n');


    // ----------------------------------------------------
    // TEST 8: ADMIN REPORTS INTEGRATION
    // ----------------------------------------------------
    console.log('▶ TEST 8: ADMIN REPORTS INTEGRATION');
    const adminRepDetails = await adminService.getReportDetailsAdmin(createdReportId);
    if (adminRepDetails.domain !== 'Computer Science') throw new Error('Admin Report Details failed to retrieve domain field');
    console.log(`  [T8] Admin Report Details verified. Type: ${adminRepDetails.reportType} | Domain: ${adminRepDetails.domain}\n`);


    // ----------------------------------------------------
    // TEST 9: OLD REPORT COMPATIBILITY
    // ----------------------------------------------------
    console.log('▶ TEST 9: OLD REPORT COMPATIBILITY');
    // Save legacy report without domain field
    const oldRepRef = db.collection('reports').doc();
    oldReportId = oldRepRef.id;
    await oldRepRef.set({
      userId: testStudentUid,
      reportType: 'error-detection',
      title: 'Legacy Report Without Domain',
      status: 'completed',
      summary: { totalStatements: 5, verified: 5 },
      createdAt: new Date(),
    });

    const oldAdminDetails = await adminService.getReportDetailsAdmin(oldReportId);
    if (!oldAdminDetails || oldAdminDetails.id !== oldReportId) throw new Error('Failed to retrieve old report');
    console.log('  [T9] Legacy report without domain field retrieved safely without crashing\n');


    // ----------------------------------------------------
    // TEST 10: COPIED CONTENT DETECTION UNAFFECTED
    // ----------------------------------------------------
    console.log('▶ TEST 10: COPIED CONTENT DETECTION UNAFFECTED');
    const file1Path = path.join(__dirname, `file1_${testId}.txt`);
    const file2Path = path.join(__dirname, `file2_${testId}.txt`);
    fs.writeFileSync(file1Path, 'Data Structures and Algorithms form the foundation of computer science software development.');
    fs.writeFileSync(file2Path, 'Data Structures and Algorithms form the core foundation of computer science software development.');

    const sessionCc = registerUpload(testStudentUid, 'copied-content', [
      { uploadPath: file1Path, originalName: `File1_${testId}.txt`, mimeType: 'text/plain' },
      { uploadPath: file2Path, originalName: `File2_${testId}.txt`, mimeType: 'text/plain' },
    ]);

    const ccResult = await copiedContentService.analyzeCopiedContent(testUser, sessionCc.uploadId);
    if (!ccResult || !ccResult.reportId) throw new Error('Copied Content Detection analysis failed!');
    console.log(`  [T10] Copied Content Detection executed independently and successfully! Report ID: ${ccResult.reportId}\n`);
    
    fs.unlinkSync(file1Path);
    fs.unlinkSync(file2Path);

    console.log('====================================================');
    console.log(' 🎉 ALL 10 COMPUTER SCIENCE DOMAIN TESTS PASSED!');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ CS DOMAIN RESTRICTION TEST FAILURE:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    // Clean up test documents
    if (cloudKsId) await db.collection('knowledgeSources').doc(cloudKsId).delete().catch(() => {});
    if (dbmsKsId) await db.collection('knowledgeSources').doc(dbmsKsId).delete().catch(() => {});
    if (createdReportId) await db.collection('reports').doc(createdReportId).delete().catch(() => {});
    if (oldReportId) await db.collection('reports').doc(oldReportId).delete().catch(() => {});
  }
}

runCSDomainRestrictionTests().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
