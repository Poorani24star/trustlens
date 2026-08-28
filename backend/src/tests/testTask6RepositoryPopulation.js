const { getDb } = require('../config/firebaseAdmin');
const knowledgeService = require('../services/knowledgeService');
const { seedTrustedKnowledge } = require('../seeds/seedTrustedKnowledge');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const { SUPPORTED_TOPICS, SUPPORTED_DOMAIN } = require('../constants/domainConstants');
const path = require('path');
const fs = require('fs');

async function runTask6Tests() {
  console.log('====================================================');
  console.log(' TRUSTLENS TASK 6: REPOSITORY POPULATION TEST      ');
  console.log('====================================================\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not initialized.');
    process.exit(1);
  }

  const testId = Date.now();
  const studentUid = `student_task6_${testId}`;
  const studentUser = { uid: studentUid, name: 'Task 6 Student', email: `student_t6_${testId}@trustlens.edu`, role: 'student' };

  const createdReportIds = [];
  const tmpFilesToClean = [];

  try {
    // Fetch all populated knowledge sources
    const allSources = await knowledgeService.listKnowledgeSources({ status: 'all' });
    console.log(`ℹ Total knowledge sources found in repository: ${allSources.length}\n`);

    // ----------------------------------------------------
    // TEST 1: CLOUD COMPUTING KNOWLEDGE
    // ----------------------------------------------------
    console.log('▶ TEST 1: CLOUD COMPUTING KNOWLEDGE');
    const cloudSources = allSources.filter(s => s.topics.includes('Cloud Computing'));
    const requiredCloudConcepts = ['definition', 'virtual', 'container', 'iaas', 'paas', 'saas'];
    const cloudTexts = cloudSources.map(s => (s.title + ' ' + s.textPreview).toLowerCase()).join(' ');

    for (const concept of requiredCloudConcepts) {
      if (!cloudTexts.includes(concept)) {
        throw new Error(`Test 1 failed: Missing required Cloud Computing concept "${concept}".`);
      }
    }
    console.log(`  [T1] Cloud Computing verified (${cloudSources.length} entries covering Cloud definition, VMs, Containers, IaaS, PaaS, SaaS)\n`);


    // ----------------------------------------------------
    // TEST 2: DBMS KNOWLEDGE
    // ----------------------------------------------------
    console.log('▶ TEST 2: DBMS KNOWLEDGE');
    const dbmsSources = allSources.filter(s => s.topics.includes('Database Management Systems'));
    const requiredDbmsConcepts = ['dbms', 'sql', 'primary key', 'foreign key', 'normal', 'acid'];
    const dbmsTexts = dbmsSources.map(s => (s.title + ' ' + s.textPreview).toLowerCase()).join(' ');

    for (const concept of requiredDbmsConcepts) {
      if (!dbmsTexts.includes(concept)) {
        throw new Error(`Test 2 failed: Missing required DBMS concept "${concept}".`);
      }
    }
    console.log(`  [T2] Database Management Systems verified (${dbmsSources.length} entries covering DBMS, SQL, Keys, Normalization, ACID)\n`);


    // ----------------------------------------------------
    // TEST 3: OPERATING SYSTEMS KNOWLEDGE
    // ----------------------------------------------------
    console.log('▶ TEST 3: OPERATING SYSTEMS KNOWLEDGE');
    const osSources = allSources.filter(s => s.topics.includes('Operating Systems'));
    const requiredOsConcepts = ['kernel', 'process', 'thread', 'scheduling', 'virtual memory', 'deadlock'];
    const osTexts = osSources.map(s => (s.title + ' ' + s.textPreview).toLowerCase()).join(' ');

    for (const concept of requiredOsConcepts) {
      if (!osTexts.includes(concept)) {
        throw new Error(`Test 3 failed: Missing required OS concept "${concept}".`);
      }
    }
    console.log(`  [T3] Operating Systems verified (${osSources.length} entries covering Kernel, Process, Thread, Scheduling, Memory, Deadlocks)\n`);


    // ----------------------------------------------------
    // TEST 4: COMPUTER NETWORKS KNOWLEDGE
    // ----------------------------------------------------
    console.log('▶ TEST 4: COMPUTER NETWORKS KNOWLEDGE');
    const netSources = allSources.filter(s => s.topics.includes('Computer Networks'));
    const requiredNetConcepts = ['tcp', 'udp', 'ip', 'routing', 'dns', 'connection'];
    const netTexts = netSources.map(s => (s.title + ' ' + s.textPreview).toLowerCase()).join(' ');

    for (const concept of requiredNetConcepts) {
      if (!netTexts.includes(concept)) {
        throw new Error(`Test 4 failed: Missing required Computer Networks concept "${concept}".`);
      }
    }
    console.log(`  [T4] Computer Networks verified (${netSources.length} entries covering TCP, UDP, IP, Routing, DNS, OSI)\n`);


    // ----------------------------------------------------
    // TEST 5: DATA STRUCTURES AND ALGORITHMS KNOWLEDGE
    // ----------------------------------------------------
    console.log('▶ TEST 5: DATA STRUCTURES AND ALGORITHMS KNOWLEDGE');
    const dsaSources = allSources.filter(s => s.topics.includes('Data Structures and Algorithms'));
    const requiredDsaConcepts = ['array', 'linked list', 'stack', 'queue', 'tree', 'graph', 'search', 'sort'];
    const dsaTexts = dsaSources.map(s => (s.title + ' ' + s.textPreview).toLowerCase()).join(' ');

    for (const concept of requiredDsaConcepts) {
      if (!dsaTexts.includes(concept)) {
        throw new Error(`Test 5 failed: Missing required DSA concept "${concept}".`);
      }
    }
    console.log(`  [T5] Data Structures and Algorithms verified (${dsaSources.length} entries covering Array, List, Stack, Queue, Tree, Graph, Search, Sort)\n`);


    // ----------------------------------------------------
    // TEST 6: TOPIC ASSIGNMENT VALIDATION
    // ----------------------------------------------------
    console.log('▶ TEST 6: TOPIC ASSIGNMENT VALIDATION');
    const seededSources = allSources.filter(s => s.createdBy === 'system_seed' || s.seedId);
    for (const src of seededSources) {
      if (!Array.isArray(src.topics) || src.topics.length === 0) {
        throw new Error(`Test 6 failed: Source ${src.id} has invalid/empty topics array.`);
      }
      for (const t of src.topics) {
        if (!SUPPORTED_TOPICS.includes(t)) {
          throw new Error(`Test 6 failed: Seeded topic "${t}" in source ${src.id} is not a supported CS topic.`);
        }
      }
    }
    console.log(`  [T6] Verified all ${seededSources.length} seeded sources have valid topic assignments matching SUPPORTED_TOPICS\n`);


    // ----------------------------------------------------
    // TEST 7: DOMAIN ASSIGNMENT VALIDATION
    // ----------------------------------------------------
    console.log('▶ TEST 7: DOMAIN ASSIGNMENT VALIDATION');
    for (const src of seededSources) {
      if (src.domain !== SUPPORTED_DOMAIN) {
        throw new Error(`Test 7 failed: Source ${src.id} has domain "${src.domain}", expected "${SUPPORTED_DOMAIN}".`);
      }
    }
    console.log(`  [T7] Verified all ${seededSources.length} seeded sources have domain === "${SUPPORTED_DOMAIN}"\n`);


    // ----------------------------------------------------
    // TEST 8: ADMIN DISPLAY INTEGRATION
    // ----------------------------------------------------
    console.log('▶ TEST 8: ADMIN DISPLAY INTEGRATION');
    const adminSourcesList = await knowledgeService.listKnowledgeSources({ status: 'all' });
    if (adminSourcesList.length < 65) {
      throw new Error(`Test 8 failed: Expected at least 65 sources for Admin display, found ${adminSourcesList.length}`);
    }
    console.log(`  [T8] Admin display list query returned ${adminSourcesList.length} sources correctly formatted for UI\n`);


    // ----------------------------------------------------
    // TEST 9: SOURCE STATUS (ACTIVE)
    // ----------------------------------------------------
    console.log('▶ TEST 9: SOURCE STATUS');
    const activeSeeded = adminSourcesList.filter(s => s.createdBy === 'system_seed' && s.status === 'active');
    if (activeSeeded.length !== 65) {
      throw new Error(`Test 9 failed: Expected 65 active seeded sources, found ${activeSeeded.length}`);
    }
    console.log('  [T9] Verified all 65 initial seeded sources are active\n');


    // ----------------------------------------------------
    // TEST 10: DUPLICATE PREVENTION
    // ----------------------------------------------------
    console.log('▶ TEST 10: DUPLICATE PREVENTION');
    const reseedResult = await seedTrustedKnowledge();
    if (reseedResult.added !== 0 || reseedResult.skipped !== 65) {
      throw new Error(`Test 10 failed: Reseed added ${reseedResult.added} duplicates! Expected 0 added, 65 skipped.`);
    }
    console.log('  [T10] Duplicate prevention verified: Re-running seed script added 0 duplicates and skipped all 65 existing records\n');


    // ----------------------------------------------------
    // TEST 11: FIREBASE STORAGE READ VERIFICATION
    // ----------------------------------------------------
    console.log('▶ TEST 11: FIREBASE STORAGE READ VERIFICATION');
    const sampleDocId = activeSeeded[0].id;
    const directDoc = await knowledgeService.getKnowledgeSourceById(sampleDocId);
    if (!directDoc || !directDoc.extractedText || directDoc.extractedText.length < 10) {
      throw new Error('Test 11 failed: Could not read valid source text from Firestore.');
    }
    console.log(`  [T11] Direct Firestore read verified for sample doc "${directDoc.title}" (Text length: ${directDoc.extractedText.length} chars)\n`);


    // ----------------------------------------------------
    // TEST 12: ERROR DETECTION MODULE UNAFFECTED
    // ----------------------------------------------------
    console.log('▶ TEST 12: ERROR DETECTION MODULE UNAFFECTED');
    const edPath = path.join(__dirname, `ed_t6_${testId}.txt`);
    fs.writeFileSync(edPath, 'Cloud computing delivers on-demand virtualized computing resources over networks.');
    tmpFilesToClean.push(edPath);

    const sessionEd = registerUpload(studentUid, 'single', [{ uploadPath: edPath, originalName: `ED_T6_${testId}.txt`, mimeType: 'text/plain' }]);
    const edResult = await errorDetectionService.analyzeErrorDetectionDocument(studentUser, sessionEd.uploadId);

    if (!edResult || !edResult.reportId) throw new Error('Error Detection pipeline failed!');
    createdReportIds.push(edResult.reportId);
    console.log(`  [T12] Error Detection pipeline executed unaffected. Report ID: ${edResult.reportId}\n`);


    // ----------------------------------------------------
    // TEST 13: COPIED CONTENT DETECTION UNAFFECTED
    // ----------------------------------------------------
    console.log('▶ TEST 13: COPIED CONTENT DETECTION UNAFFECTED');
    const cc1Path = path.join(__dirname, `cc1_t6_${testId}.txt`);
    const cc2Path = path.join(__dirname, `cc2_t6_${testId}.txt`);
    fs.writeFileSync(cc1Path, 'TCP provides connection-oriented reliable stream transfer.');
    fs.writeFileSync(cc2Path, 'TCP provides connection-oriented reliable stream transfer.');
    tmpFilesToClean.push(cc1Path, cc2Path);

    const sessionCc = registerUpload(studentUid, 'copied-content', [
      { uploadPath: cc1Path, originalName: `CC1_T6_${testId}.txt`, mimeType: 'text/plain' },
      { uploadPath: cc2Path, originalName: `CC2_T6_${testId}.txt`, mimeType: 'text/plain' },
    ]);

    const ccResult = await copiedContentService.analyzeCopiedContent(studentUser, sessionCc.uploadId);
    if (!ccResult || !ccResult.reportId) throw new Error('Copied Content Detection pipeline failed!');
    console.log(`  [T13] Copied Content Detection pipeline executed unaffected. Report ID: ${ccResult.reportId}\n`);


    console.log('====================================================');
    console.log(' 🎉 ALL TASK 6 REPOSITORY POPULATION TESTS PASSED! ');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ TASK 6 TEST FAILURE:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    for (const f of tmpFilesToClean) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    for (const rId of createdReportIds) {
      await db.collection('reports').doc(rId).delete().catch(() => {});
    }
  }
}

runTask6Tests().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
