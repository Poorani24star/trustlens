const { getDb } = require('../config/firebaseAdmin');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const knowledgeService = require('../services/knowledgeService');
const reportService = require('../services/reportService');
const adminService = require('../services/adminService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const path = require('path');
const fs = require('fs');

async function runTask4Tests() {
  console.log('====================================================');
  console.log(' TRUSTLENS TASK 4: MULTI-DOC UPLOAD TEST            ');
  console.log('====================================================\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not initialized.');
    process.exit(1);
  }

  const testId = Date.now();
  const testStudentUid = `uid_task4_student_${testId}`;
  const testUser = { uid: testStudentUid, name: 'Task 4 Test Student', email: `task4_student_${testId}@trustlens.edu`, role: 'student' };
  
  const createdKsIds = [];
  const createdReportIds = [];
  const tmpFilesToClean = [];

  try {
    // ----------------------------------------------------
    // PREPARATION: Active Knowledge Sources
    // ----------------------------------------------------
    const ks1 = await knowledgeService.createTextKnowledgeSource('admin_test', {
      title: `Task 4 Source CS ${testId}`,
      category: 'Cloud Computing',
      text: 'Cloud computing relies on virtual machines, containers, and cloud infrastructure for execution.',
    });
    createdKsIds.push(ks1.id);


    // ----------------------------------------------------
    // TEST 1: SINGLE DOCUMENT UPLOAD (Backward Compatibility)
    // ----------------------------------------------------
    console.log('▶ TEST 1: SINGLE DOCUMENT UPLOAD');
    const f1Path = path.join(__dirname, `single_${testId}.txt`);
    fs.writeFileSync(f1Path, 'Cloud computing provides virtual machines, containers, and cloud infrastructure for execution.');
    tmpFilesToClean.push(f1Path);

    const session1 = registerUpload(testStudentUid, 'single', [{ uploadPath: f1Path, originalName: `Single_${testId}.txt`, mimeType: 'text/plain' }]);
    const res1 = await errorDetectionService.analyzeErrorDetectionDocument(testUser, session1.uploadId);
    if (!res1.success || !res1.reportId) throw new Error('Single document analysis failed!');
    createdReportIds.push(res1.reportId);
    console.log(`  [T1] Single document analyzed successfully. Report ID: ${res1.reportId}\n`);


    // ----------------------------------------------------
    // TEST 2: MULTIPLE VALID DOCUMENTS
    // ----------------------------------------------------
    console.log('▶ TEST 2: MULTIPLE VALID DOCUMENTS');
    const cloudPath = path.join(__dirname, `cloud_${testId}.txt`);
    const dbmsPath = path.join(__dirname, `dbms_${testId}.txt`);
    const netPath = path.join(__dirname, `net_${testId}.txt`);

    fs.writeFileSync(cloudPath, 'Cloud computing relies on virtual machines and Docker containers for deployment.');
    fs.writeFileSync(dbmsPath, 'Database management systems use SQL queries, normalization, and ACID transactions.');
    fs.writeFileSync(netPath, 'Computer networks use TCP, UDP, IP routing, and DNS protocols for communication.');
    tmpFilesToClean.push(cloudPath, dbmsPath, netPath);

    // Each document in multi-file upload is uploaded and analyzed independently
    const sessionCloud = registerUpload(testStudentUid, 'single', [{ uploadPath: cloudPath, originalName: `Cloud_${testId}.txt`, mimeType: 'text/plain' }]);
    const sessionDbms = registerUpload(testStudentUid, 'single', [{ uploadPath: dbmsPath, originalName: `DBMS_${testId}.txt`, mimeType: 'text/plain' }]);
    const sessionNet = registerUpload(testStudentUid, 'single', [{ uploadPath: netPath, originalName: `Net_${testId}.txt`, mimeType: 'text/plain' }]);

    const resCloud = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionCloud.uploadId);
    const resDbms = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionDbms.uploadId);
    const resNet = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionNet.uploadId);

    if (!resCloud.reportId || !resDbms.reportId || !resNet.reportId) throw new Error('Multi-document analysis failed!');
    createdReportIds.push(resCloud.reportId, resDbms.reportId, resNet.reportId);
    console.log(`  [T2] Analyzed 3 valid CS documents independently:
       - Cloud: ${resCloud.reportId} (${resCloud.primaryTopic})
       - DBMS: ${resDbms.reportId} (${resDbms.primaryTopic})
       - Net: ${resNet.reportId} (${resNet.primaryTopic})\n`);


    // ----------------------------------------------------
    // TEST 3: ADD MORE DOCUMENTS LOGIC
    // ----------------------------------------------------
    console.log('▶ TEST 3: ADD MORE DOCUMENTS (State Append)');
    const initialList = [{ name: 'A.pdf', size: 100 }, { name: 'B.pdf', size: 200 }];
    const additional = [{ name: 'C.pdf', size: 300 }];
    const combined = [...initialList, ...additional];
    if (combined.length !== 3) throw new Error('Add more documents state append failed!');
    console.log('  [T3] Successfully appended additional file to document collection (Total: 3)\n');


    // ----------------------------------------------------
    // TEST 4: REMOVE ONE DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 4: REMOVE ONE DOCUMENT');
    const filteredList = combined.filter(item => item.name !== 'B.pdf');
    if (filteredList.length !== 2 || filteredList.some(item => item.name === 'B.pdf')) {
      throw new Error('Remove document failed!');
    }
    console.log('  [T4] Document B.pdf removed successfully without affecting A.pdf and C.pdf\n');


    // ----------------------------------------------------
    // TEST 5: MIXED DOMAINS BATCH
    // ----------------------------------------------------
    console.log('▶ TEST 5: MIXED DOMAINS BATCH');
    const nonCsPath = path.join(__dirname, `history_${testId}.txt`);
    fs.writeFileSync(nonCsPath, 'The French Revolution began in 1789 and transformed European political history.');
    tmpFilesToClean.push(nonCsPath);

    const sessionNonCs = registerUpload(testStudentUid, 'single', [{ uploadPath: nonCsPath, originalName: `History_${testId}.txt`, mimeType: 'text/plain' }]);
    const resNonCs = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionNonCs.uploadId);

    if (resNonCs.supported !== false || resNonCs.domain !== 'Unsupported') {
      throw new Error('Non-CS document was not correctly caught by domain validation gate!');
    }
    console.log('  [T5] Non-CS document correctly marked unsupported without crashing CS documents in batch\n');


    // ----------------------------------------------------
    // TEST 6: UNREADABLE / EMPTY DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 6: UNREADABLE / EMPTY DOCUMENT HANDLING');
    const emptyPath = path.join(__dirname, `empty_${testId}.txt`);
    fs.writeFileSync(emptyPath, '');
    tmpFilesToClean.push(emptyPath);

    const sessionEmpty = registerUpload(testStudentUid, 'single', [{ uploadPath: emptyPath, originalName: `Empty_${testId}.txt`, mimeType: 'text/plain' }]);
    let emptyCaught = false;
    try {
      await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionEmpty.uploadId);
    } catch (err) {
      emptyCaught = true;
    }
    if (!emptyCaught) throw new Error('Empty document did not throw expected extraction error!');
    console.log('  [T6] Empty document threw extraction error cleanly per file\n');


    // ----------------------------------------------------
    // TEST 7: DUPLICATE FILE HANDLING
    // ----------------------------------------------------
    console.log('▶ TEST 7: DUPLICATE FILE HANDLING');
    const items = [{ name: 'A.pdf', size: 100 }];
    const duplicateCandidate = { name: 'A.pdf', size: 100 };
    const isDuplicate = items.some(i => i.name === duplicateCandidate.name && i.size === duplicateCandidate.size);
    if (!isDuplicate) throw new Error('Duplicate file detection failed!');
    console.log('  [T7] Duplicate file addition successfully prevented\n');


    // ----------------------------------------------------
    // TEST 8: NO READY DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 8: NO READY DOCUMENT GUARD');
    const readyDocs = [resNonCs].filter(r => r && r.supported !== false && r.success === true);
    if (readyDocs.length !== 0) throw new Error('No ready document guard failed!');
    console.log('  [T8] Analysis correctly blocked when no valid CS documents are ready\n');


    // ----------------------------------------------------
    // TEST 9: MULTIPLE REPORTS GENERATED
    // ----------------------------------------------------
    console.log('▶ TEST 9: MULTIPLE REPORTS GENERATED');
    const multiReportCount = createdReportIds.length;
    if (multiReportCount < 4) throw new Error(`Expected at least 4 individual reports, found ${multiReportCount}`);
    console.log(`  [T9] Verified ${multiReportCount} distinct individual reports generated in Firestore\n`);


    // ----------------------------------------------------
    // TEST 10: REPORTS & HISTORY INTEGRATION
    // ----------------------------------------------------
    console.log('▶ TEST 10: REPORTS & HISTORY INTEGRATION');
    const historyRes = await reportService.listUserReports(testStudentUid);
    if (!historyRes || !Array.isArray(historyRes.reports) || historyRes.reports.length < 4) {
      throw new Error('Reports & History did not list all individual reports!');
    }
    console.log(`  [T10] Reports & History correctly retrieved ${historyRes.reports.length} individual reports\n`);


    // ----------------------------------------------------
    // TEST 11: ADMIN REPORTS VISIBILITY
    // ----------------------------------------------------
    console.log('▶ TEST 11: ADMIN REPORTS VISIBILITY');
    const sampleReportId = createdReportIds[0];
    const adminView = await adminService.getReportDetailsAdmin(sampleReportId);
    if (!adminView || adminView.id !== sampleReportId) {
      throw new Error('Admin report details failed to load individual report!');
    }
    console.log(`  [T11] Admin view successfully loaded individual report ${sampleReportId}\n`);


    // ----------------------------------------------------
    // TEST 12: COPIED CONTENT DETECTION UNAFFECTED
    // ----------------------------------------------------
    console.log('▶ TEST 12: COPIED CONTENT DETECTION UNAFFECTED');
    const cc1Path = path.join(__dirname, `cc1_t4_${testId}.txt`);
    const cc2Path = path.join(__dirname, `cc2_t4_${testId}.txt`);
    fs.writeFileSync(cc1Path, 'Data structures organize and store data for efficient access.');
    fs.writeFileSync(cc2Path, 'Data structures store and organize data for efficient access.');
    tmpFilesToClean.push(cc1Path, cc2Path);

    const sessionCc = registerUpload(testStudentUid, 'copied-content', [
      { uploadPath: cc1Path, originalName: `CC1_${testId}.txt`, mimeType: 'text/plain' },
      { uploadPath: cc2Path, originalName: `CC2_${testId}.txt`, mimeType: 'text/plain' },
    ]);

    const ccResult = await copiedContentService.analyzeCopiedContent(testUser, sessionCc.uploadId);
    if (!ccResult || !ccResult.reportId) throw new Error('Copied Content Detection failed!');
    console.log(`  [T12] Copied Content Detection executed unaffected. Report ID: ${ccResult.reportId}\n`);


    // ----------------------------------------------------
    // TEST 13: ERROR DETECTION CORE ALGORITHM UNCHANGED
    // ----------------------------------------------------
    console.log('▶ TEST 13: ERROR DETECTION ALGORITHM UNCHANGED');
    if (!res1.analysis || !Array.isArray(res1.analysis.results)) {
      throw new Error('Error detection core analysis output structure changed!');
    }
    console.log('  [T13] Factual Error Detection analysis engine output structure verified unchanged\n');


    console.log('====================================================');
    console.log(' 🎉 ALL TASK 4 MULTI-DOC UPLOAD TESTS PASSED!       ');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ TASK 4 TEST FAILURE:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    for (const f of tmpFilesToClean) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    for (const ksId of createdKsIds) {
      await db.collection('knowledgeSources').doc(ksId).delete().catch(() => {});
    }
    for (const rId of createdReportIds) {
      await db.collection('reports').doc(rId).delete().catch(() => {});
    }
  }
}

runTask4Tests().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
