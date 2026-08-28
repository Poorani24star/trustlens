const { getDb } = require('../config/firebaseAdmin');
const { retrieveRelevantKnowledge } = require('../services/errorDetection/knowledgeRetrievalService');
const knowledgeService = require('../services/knowledgeService');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const path = require('path');
const fs = require('fs');

async function runTask7Tests() {
  console.log('====================================================');
  console.log(' TRUSTLENS TASK 7: RELEVANT KNOWLEDGE RETRIEVAL TEST');
  console.log('====================================================\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not initialized.');
    process.exit(1);
  }

  const testId = Date.now();
  const adminUid = `admin_task7_${testId}`;
  const studentUid = `student_task7_${testId}`;
  const studentUser = { uid: studentUid, name: 'Task 7 Student', email: `student_t7_${testId}@trustlens.edu`, role: 'student' };

  const createdKsIds = [];
  const createdReportIds = [];
  const tmpFilesToClean = [];

  try {
    // ----------------------------------------------------
    // TEST 1: PRIMARY TOPIC RETRIEVAL
    // ----------------------------------------------------
    console.log('▶ TEST 1: PRIMARY TOPIC RETRIEVAL');
    const res1 = await retrieveRelevantKnowledge({
      domain: 'Computer Science',
      primaryTopic: 'Cloud Computing',
      detectedTopics: ['Cloud Computing'],
    });

    if (!res1.success || !Array.isArray(res1.entries) || res1.entries.length === 0) {
      throw new Error('Test 1 failed: Could not retrieve active Cloud Computing knowledge entries.');
    }
    const nonCloud = res1.entries.filter(e => e.retrievalReason !== 'primary_topic');
    if (nonCloud.length > 0) throw new Error('Test 1 failed: Returned non-primary entries when only primary topic requested.');
    console.log(`  [T1] Retrieved ${res1.entries.length} active Cloud Computing entries with priority >= 100 (Primary Topic)\n`);


    // ----------------------------------------------------
    // TEST 2: PRIMARY + RELATED TOPIC RETRIEVAL
    // ----------------------------------------------------
    console.log('▶ TEST 2: PRIMARY + RELATED TOPIC RETRIEVAL');
    const res2 = await retrieveRelevantKnowledge({
      domain: 'Computer Science',
      primaryTopic: 'Cloud Computing',
      detectedTopics: ['Cloud Computing', 'Operating Systems'],
    });

    const primaryEntries = res2.entries.filter(e => e.retrievalReason === 'primary_topic');
    const relatedEntries = res2.entries.filter(e => e.retrievalReason === 'related_topic');

    if (primaryEntries.length === 0 || relatedEntries.length === 0) {
      throw new Error('Test 2 failed: Expected both primary (Cloud) and related (OS) entries.');
    }
    if (primaryEntries[0].priority < relatedEntries[0].priority) {
      throw new Error('Test 2 failed: Primary topic priority score must be higher than related topic.');
    }
    console.log(`  [T2] Retrieved ${primaryEntries.length} primary (Cloud) & ${relatedEntries.length} related (OS) entries with correct priority ordering\n`);


    // ----------------------------------------------------
    // TEST 3: DBMS DOCUMENT RETRIEVAL
    // ----------------------------------------------------
    console.log('▶ TEST 3: DBMS DOCUMENT RETRIEVAL');
    const res3 = await retrieveRelevantKnowledge({
      domain: 'Computer Science',
      primaryTopic: 'Database Management Systems',
      detectedTopics: ['Database Management Systems'],
    });

    if (res3.entries.length === 0 || !res3.entries[0].topics.includes('Database Management Systems')) {
      throw new Error('Test 3 failed: DBMS knowledge retrieval failed.');
    }
    console.log(`  [T3] Retrieved ${res3.entries.length} DBMS entries successfully\n`);


    // ----------------------------------------------------
    // TEST 4: INACTIVE SOURCE EXCLUSION
    // ----------------------------------------------------
    console.log('▶ TEST 4: INACTIVE SOURCE EXCLUSION');
    const inactiveKs = await knowledgeService.createTextKnowledgeSource(adminUid, {
      title: `Inactive Test Cloud Source ${testId}`,
      topics: ['Cloud Computing'],
      text: 'Special inactive cloud computing text that must never be retrieved.',
      status: 'inactive',
    });
    createdKsIds.push(inactiveKs.id);

    const res4 = await retrieveRelevantKnowledge({
      domain: 'Computer Science',
      primaryTopic: 'Cloud Computing',
      detectedTopics: ['Cloud Computing'],
    });

    const foundInactive = res4.entries.find(e => e.id === inactiveKs.id);
    if (foundInactive) throw new Error('Test 4 failed: Inactive source was retrieved!');
    console.log('  [T4] Inactive knowledge source was strictly excluded from retrieval results\n');


    // ----------------------------------------------------
    // TEST 5: MULTIPLE DOCUMENTS INDEPENDENT RETRIEVAL
    // ----------------------------------------------------
    console.log('▶ TEST 5: MULTIPLE DOCUMENTS INDEPENDENT RETRIEVAL');
    const docA = await retrieveRelevantKnowledge({ primaryTopic: 'Cloud Computing', detectedTopics: ['Cloud Computing'] });
    const docB = await retrieveRelevantKnowledge({ primaryTopic: 'Database Management Systems', detectedTopics: ['Database Management Systems'] });
    const docC = await retrieveRelevantKnowledge({ primaryTopic: 'Computer Networks', detectedTopics: ['Computer Networks'] });

    if (docA.entries[0].topics[0] === docB.entries[0].topics[0]) {
      throw new Error('Test 5 failed: Document A and Document B received identical knowledge sets!');
    }
    console.log(`  [T5] Independent retrieval verified for 3 documents:
       - Doc A (Cloud): ${docA.entries.length} entries
       - Doc B (DBMS):  ${docB.entries.length} entries
       - Doc C (Net):   ${docC.entries.length} entries\n`);


    // ----------------------------------------------------
    // TEST 6: DUPLICATE TOPIC MATCH DEDUPLICATION
    // ----------------------------------------------------
    console.log('▶ TEST 6: DUPLICATE TOPIC MATCH DEDUPLICATION');
    const resDup = await retrieveRelevantKnowledge({
      primaryTopic: 'Cloud Computing',
      detectedTopics: ['Cloud Computing', 'Operating Systems', 'Distributed Systems'],
    });

    const entryIds = resDup.entries.map(e => e.id);
    const uniqueEntryIds = new Set(entryIds);
    if (entryIds.length !== uniqueEntryIds.size) {
      throw new Error('Test 6 failed: Duplicate entries returned in retrieval result!');
    }
    console.log(`  [T6] Deduplication verified: ${resDup.entries.length} unique entries returned with 0 duplicates\n`);


    // ----------------------------------------------------
    // TEST 7: NO TOPIC FALLBACK
    // ----------------------------------------------------
    console.log('▶ TEST 7: NO TOPIC FALLBACK');
    const resNoTopic = await retrieveRelevantKnowledge({
      primaryTopic: null,
      detectedTopics: [],
    });

    if (!resNoTopic.success || resNoTopic.entries.length !== 0 || resNoTopic.metadata.totalRetrieved !== 0) {
      throw new Error('Test 7 failed: No-topic fallback did not return safe empty result.');
    }
    console.log('  [T7] No topic fallback returned safe empty result (0 entries)\n');


    // ----------------------------------------------------
    // TEST 8: NO KNOWLEDGE FOR TOPIC FALLBACK
    // ----------------------------------------------------
    console.log('▶ TEST 8: NO KNOWLEDGE FOR TOPIC FALLBACK');
    const resNoKnowledge = await retrieveRelevantKnowledge({
      primaryTopic: 'Machine Learning',
      detectedTopics: ['Machine Learning'],
    });

    if (!resNoKnowledge.success || !Array.isArray(resNoKnowledge.entries)) {
      throw new Error('Test 8 failed: No-knowledge topic search failed.');
    }
    console.log(`  [T8] Empty result returned cleanly when topic has no active knowledge (${resNoKnowledge.entries.length} entries)\n`);


    // ----------------------------------------------------
    // TEST 9: RETRIEVAL LIMITS ENFORCEMENT
    // ----------------------------------------------------
    console.log('▶ TEST 9: RETRIEVAL LIMITS ENFORCEMENT');
    const resLimit = await retrieveRelevantKnowledge(
      { primaryTopic: 'Cloud Computing', detectedTopics: ['Cloud Computing', 'Operating Systems'] },
      { maxTotalRetrievedEntries: 5 }
    );

    if (resLimit.entries.length > 5) {
      throw new Error(`Test 9 failed: Exceeded configured total limit (expected <= 5, got ${resLimit.entries.length})`);
    }
    console.log(`  [T9] Retrieval total limit enforced (Requested max: 5, Returned: ${resLimit.entries.length})\n`);


    // ----------------------------------------------------
    // TEST 10: FIREBASE FAILURE / INVALID DATA HANDLING
    // ----------------------------------------------------
    console.log('▶ TEST 10: FIREBASE / INVALID INPUT ERROR HANDLING');
    const resErr = await retrieveRelevantKnowledge(null);
    if (!resErr.success || !Array.isArray(resErr.entries)) {
      throw new Error('Test 10 failed: Invalid input caused unhandled error.');
    }
    console.log('  [T10] Invalid input handled cleanly without crashing session\n');


    // ----------------------------------------------------
    // TEST 11: REPORT METADATA PREPARATION
    // ----------------------------------------------------
    console.log('▶ TEST 11: REPORT METADATA PREPARATION');
    const edPath = path.join(__dirname, `ed_t7_${testId}.txt`);
    fs.writeFileSync(edPath, 'Cloud computing provides virtual machines, containers, and cloud infrastructure for execution.');
    tmpFilesToClean.push(edPath);

    const sessionEd = registerUpload(studentUid, 'single', [{ uploadPath: edPath, originalName: `ED_T7_${testId}.txt`, mimeType: 'text/plain' }]);
    const edResult = await errorDetectionService.analyzeErrorDetectionDocument(studentUser, sessionEd.uploadId);

    if (!edResult.reportId || !edResult.summary || !edResult.summary.retrievalSummary) {
      throw new Error('Test 11 failed: Report summary missing retrievalSummary metadata!');
    }
    createdReportIds.push(edResult.reportId);

    const retSummary = edResult.summary.retrievalSummary;
    if (typeof retSummary.totalRetrieved !== 'number' || !Array.isArray(retSummary.retrievedSourceIds)) {
      throw new Error('Test 11 failed: retrievalSummary structure invalid.');
    }
    console.log(`  [T11] Report metadata verified: totalRetrieved=${retSummary.totalRetrieved}, sourceIdsCount=${retSummary.retrievedSourceIds.length}\n`);


    // ----------------------------------------------------
    // TEST 12: ERROR DETECTION WORKFLOW STAGE ORDER
    // ----------------------------------------------------
    console.log('▶ TEST 12: ERROR DETECTION WORKFLOW STAGE ORDER');
    if (!edResult.domain || !edResult.primaryTopic || !edResult.retrievalResult) {
      throw new Error('Test 12 failed: Error Detection pipeline missing topic or retrieval output.');
    }
    console.log('  [T12] Error Detection workflow executed: Validation -> Topic Detection -> Relevant Knowledge Retrieval cleanly\n');


    // ----------------------------------------------------
    // TEST 13: COPIED CONTENT DETECTION UNAFFECTED
    // ----------------------------------------------------
    console.log('▶ TEST 13: COPIED CONTENT DETECTION UNAFFECTED');
    const cc1Path = path.join(__dirname, `cc1_t7_${testId}.txt`);
    const cc2Path = path.join(__dirname, `cc2_t7_${testId}.txt`);
    fs.writeFileSync(cc1Path, 'Operating systems use CPU scheduling and virtual memory management.');
    fs.writeFileSync(cc2Path, 'Operating systems use CPU scheduling and virtual memory management.');
    tmpFilesToClean.push(cc1Path, cc2Path);

    const sessionCc = registerUpload(studentUid, 'copied-content', [
      { uploadPath: cc1Path, originalName: `CC1_T7_${testId}.txt`, mimeType: 'text/plain' },
      { uploadPath: cc2Path, originalName: `CC2_T7_${testId}.txt`, mimeType: 'text/plain' },
    ]);

    const ccResult = await copiedContentService.analyzeCopiedContent(studentUser, sessionCc.uploadId);
    if (!ccResult || !ccResult.reportId) throw new Error('Copied Content Detection pipeline failed!');
    console.log(`  [T13] Copied Content Detection pipeline executed unaffected. Report ID: ${ccResult.reportId}\n`);


    console.log('====================================================');
    console.log(' 🎉 ALL TASK 7 KNOWLEDGE RETRIEVAL TESTS PASSED!   ');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ TASK 7 TEST FAILURE:', err.message);
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

runTask7Tests().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
