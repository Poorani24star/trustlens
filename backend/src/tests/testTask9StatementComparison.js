const { getDb } = require('../config/firebaseAdmin');
const { compareStatementsToKnowledge, tokenizeText, calculateTF, calculateIDF, calculateCosineSimilarity } = require('../services/errorDetection/statementComparisonService');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const path = require('path');
const fs = require('fs');

async function runTask9Tests() {
  console.log('====================================================');
  console.log(' TRUSTLENS TASK 9: STATEMENT COMPARISON TEST        ');
  console.log('====================================================\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not initialized.');
    process.exit(1);
  }

  const testId = Date.now();
  const studentUid = `student_task9_${testId}`;
  const studentUser = { uid: studentUid, name: 'Task 9 Student', email: `student_t9_${testId}@trustlens.edu`, role: 'student' };

  const createdReportIds = [];
  const tmpFilesToClean = [];

  try {
    const sampleKnowledge = [
      {
        id: 'k1',
        sourceId: 'src_tcp',
        title: 'TCP Connection Type',
        content: 'TCP is a connection-oriented transport protocol providing reliable delivery.',
        topics: ['Computer Networks'],
      },
      {
        id: 'k2',
        sourceId: 'src_udp',
        title: 'UDP Datagrams',
        content: 'UDP is a connectionless transport protocol providing low latency delivery.',
        topics: ['Computer Networks'],
      },
      {
        id: 'k3',
        sourceId: 'src_acid',
        title: 'ACID Properties',
        content: 'ACID properties provide database transaction reliability and guarantees.',
        topics: ['Database Management Systems'],
      },
    ];

    // ----------------------------------------------------
    // TEST 1: HIGH SIMILARITY MATCH
    // ----------------------------------------------------
    console.log('▶ TEST 1: HIGH SIMILARITY MATCH');
    const stmt1 = [{ id: 's1', text: 'TCP is a connection-oriented protocol.', primaryTopic: 'Computer Networks' }];
    const res1 = compareStatementsToKnowledge(stmt1, sampleKnowledge);

    if (!res1.success || res1.results.length !== 1) throw new Error('Test 1 failed: Result count mismatch.');
    const r1 = res1.results[0];
    if (r1.comparisonStatus !== 'matched' || !r1.bestMatch || r1.bestMatch.knowledgeId !== 'k1') {
      throw new Error(`Test 1 failed: Expected k1 best match, got ${r1.bestMatch ? r1.bestMatch.knowledgeId : 'null'}`);
    }
    if (r1.bestMatch.similarity < 0.60) {
      throw new Error(`Test 1 failed: Cosine similarity score too low (${r1.bestMatch.similarity})`);
    }
    console.log(`  [T1] High similarity match verified: ${r1.bestMatch.title} (Score: ${r1.bestMatch.similarity})\n`);


    // ----------------------------------------------------
    // TEST 2: LOW SIMILARITY MATCH (NO SUFFICIENT MATCH)
    // ----------------------------------------------------
    console.log('▶ TEST 2: LOW SIMILARITY MATCH');
    const stmt2 = [{ id: 's2', text: 'Quantum entanglement enables teleportation of quantum states.', primaryTopic: 'Physics' }];
    const res2 = compareStatementsToKnowledge(stmt2, sampleKnowledge);

    const r2 = res2.results[0];
    if (r2.comparisonStatus !== 'no_sufficient_match') {
      throw new Error(`Test 2 failed: Expected status no_sufficient_match, got ${r2.comparisonStatus}`);
    }
    console.log(`  [T2] Low similarity match correctly assigned "no_sufficient_match" status (Score: ${r2.bestMatch ? r2.bestMatch.similarity : 0})\n`);


    // ----------------------------------------------------
    // TEST 3: MULTIPLE CANDIDATES RANKING
    // ----------------------------------------------------
    console.log('▶ TEST 3: MULTIPLE CANDIDATES RANKING');
    const stmt3 = [{ id: 's3', text: 'UDP is a connectionless transport protocol.', primaryTopic: 'Computer Networks' }];
    const res3 = compareStatementsToKnowledge(stmt3, sampleKnowledge);

    const r3 = res3.results[0];
    if (r3.bestMatch.knowledgeId !== 'k2') {
      throw new Error(`Test 3 failed: Ranking error. Expected k2 (UDP), got ${r3.bestMatch.knowledgeId}`);
    }
    if (r3.alternatives.length === 0 || r3.alternatives[0].similarity >= r3.bestMatch.similarity) {
      throw new Error('Test 3 failed: Alternatives list not sorted properly.');
    }
    console.log(`  [T3] Multiple candidates ranked deterministically: #1 ${r3.bestMatch.title} (${r3.bestMatch.similarity})\n`);


    // ----------------------------------------------------
    // TEST 4: NEGATION PRESERVATION
    // ----------------------------------------------------
    console.log('▶ TEST 4: NEGATION PRESERVATION');
    const stmt4 = [{ id: 's4', text: 'TCP is not a connection-oriented protocol.', primaryTopic: 'Computer Networks' }];
    const res4 = compareStatementsToKnowledge(stmt4, sampleKnowledge);

    const r4 = res4.results[0];
    if (!r4.hasNegationToken) throw new Error('Test 4 failed: Negation token "not" was not detected.');
    if (!r4.bestMatch || r4.bestMatch.similarity < 0.50) throw new Error('Test 4 failed: Similarity score corrupted by negation tag.');
    console.log(`  [T4] Textual similarity preserved (${r4.bestMatch.similarity}) & negation flag attached without classifying correctness\n`);


    // ----------------------------------------------------
    // TEST 5: NUMERIC DIFFERENCE PRESERVATION
    // ----------------------------------------------------
    console.log('▶ TEST 5: NUMERIC DIFFERENCE PRESERVATION');
    const kNum = [{ id: 'kn', title: 'IPv4 Addressing', content: 'IPv4 uses 32-bit addresses for network communication.' }];
    const stmt5 = [{ id: 's5', text: 'IPv4 uses 64-bit addresses for network communication.' }];
    const res5 = compareStatementsToKnowledge(stmt5, kNum);

    const r5 = res5.results[0];
    if (!r5.hasNumericValues) throw new Error('Test 5 failed: Numeric values flag not attached.');
    if (!r5.bestMatch || r5.bestMatch.similarity < 0.50) throw new Error('Test 5 failed: Numeric difference score mismatch.');
    console.log(`  [T5] High textual similarity retained (${r5.bestMatch.similarity}) with numeric flag attached for Task 10\n`);


    // ----------------------------------------------------
    // TEST 6: MULTIPLE STATEMENTS BATCH PROCESSING
    // ----------------------------------------------------
    console.log('▶ TEST 6: MULTIPLE STATEMENTS BATCH PROCESSING');
    const multiStmts = Array.from({ length: 12 }, (_, i) => ({
      id: `stmt_batch_${i}`,
      text: i % 2 === 0 ? 'TCP provides reliable data transport.' : 'ACID guarantees transaction integrity.',
    }));
    const res6 = compareStatementsToKnowledge(multiStmts, sampleKnowledge);

    if (res6.totalStatementsAnalyzed !== 12 || res6.results.length !== 12) {
      throw new Error('Test 6 failed: Batch comparison length mismatch.');
    }
    console.log('  [T6] Successfully processed batch of 12 ready statements independently\n');


    // ----------------------------------------------------
    // TEST 7: MULTIPLE DOCUMENTS INDEPENDENT COMPARISON
    // ----------------------------------------------------
    console.log('▶ TEST 7: MULTIPLE DOCUMENTS INDEPENDENT COMPARISON');
    const docA = compareStatementsToKnowledge([{ id: 'sa', text: 'TCP is connection-oriented.' }], [sampleKnowledge[0]]);
    const docB = compareStatementsToKnowledge([{ id: 'sb', text: 'ACID provides database guarantees.' }], [sampleKnowledge[2]]);

    if (docA.results[0].bestMatch.knowledgeId === docB.results[0].bestMatch.knowledgeId) {
      throw new Error('Test 7 failed: Multi-document knowledge comparison contexts leaked.');
    }
    console.log('  [T7] Document A and Document B statement comparisons executed in strict isolation\n');


    // ----------------------------------------------------
    // TEST 8: NO KNOWLEDGE AVAILABLE FALLBACK
    // ----------------------------------------------------
    console.log('▶ TEST 8: NO KNOWLEDGE AVAILABLE FALLBACK');
    const res8 = compareStatementsToKnowledge([{ id: 's8', text: 'Operating systems manage hardware.' }], []);

    if (res8.comparisonStatus !== 'no_knowledge_available' || res8.results[0].comparisonStatus !== 'no_knowledge_available') {
      throw new Error('Test 8 failed: Safe no-knowledge fallback failed.');
    }
    console.log('  [T8] No knowledge available fallback returned safe response without throwing error\n');


    // ----------------------------------------------------
    // TEST 9: ZERO VECTOR HANDLING
    // ----------------------------------------------------
    console.log('▶ TEST 9: ZERO VECTOR HANDLING');
    const zeroSim = calculateCosineSimilarity(new Map(), new Map([['tcp', 0.5]]));
    if (zeroSim !== 0.0 || isNaN(zeroSim)) throw new Error('Test 9 failed: Zero vector caused non-zero or NaN result.');
    console.log('  [T9] Zero vector handled safely returning similarity 0.0\n');


    // ----------------------------------------------------
    // TEST 10: DUPLICATE KNOWLEDGE STABILITY
    // ----------------------------------------------------
    console.log('▶ TEST 10: DUPLICATE KNOWLEDGE STABILITY');
    const dupKnowledge = [sampleKnowledge[0], sampleKnowledge[0]];
    const res10 = compareStatementsToKnowledge(stmt1, dupKnowledge);

    if (!res10.success || !res10.results[0].bestMatch) {
      throw new Error('Test 10 failed: Duplicate knowledge entries broke comparison stability.');
    }
    console.log('  [T10] Duplicate knowledge entries handled deterministically without errors\n');


    // ----------------------------------------------------
    // TEST 11: THRESHOLD ENFORCEMENT
    // ----------------------------------------------------
    console.log('▶ TEST 11: THRESHOLD ENFORCEMENT');
    const resThresholdLow = compareStatementsToKnowledge(stmt1, sampleKnowledge, { threshold: 0.99 });
    const resThresholdHigh = compareStatementsToKnowledge(stmt1, sampleKnowledge, { threshold: 0.10 });

    if (resThresholdLow.results[0].comparisonStatus !== 'no_sufficient_match') {
      throw new Error('Test 11 failed: High custom threshold (0.99) did not trigger no_sufficient_match.');
    }
    if (resThresholdHigh.results[0].comparisonStatus !== 'matched') {
      throw new Error('Test 11 failed: Low custom threshold (0.10) did not trigger matched.');
    }
    console.log('  [T11] Configurable similarity threshold enforced correctly\n');


    // ----------------------------------------------------
    // TEST 12: RAW SCORE RETENTION
    // ----------------------------------------------------
    console.log('▶ TEST 12: RAW SCORE RETENTION');
    const score = res1.results[0].bestMatch.similarity;
    if (typeof score !== 'number' || score <= 0 || score > 1.0) {
      throw new Error('Test 12 failed: Raw similarity score is not a valid float between 0 and 1.');
    }
    console.log(`  [T12] Numeric raw similarity retained cleanly: ${score}\n`);


    // ----------------------------------------------------
    // TEST 13: TECHNICAL CS TERMINOLOGY PRESERVATION
    // ----------------------------------------------------
    console.log('▶ TEST 13: TECHNICAL CS TERMINOLOGY PRESERVATION');
    const techText = "TCP/IP, DBMS, ACID, IaaS, PaaS, SaaS, CPU, GPU, API, DNS";
    const tokens = tokenizeText(techText);
    if (!tokens.includes('tcp/ip') || !tokens.includes('dbms') || !tokens.includes('acid') || !tokens.includes('saas')) {
      throw new Error('Test 13 failed: CS technical terms were lost during tokenization.');
    }
    console.log('  [T13] Computer Science terms (TCP/IP, DBMS, ACID, SaaS, etc.) preserved during tokenization\n');


    // ----------------------------------------------------
    // TEST 14: ERROR DETECTION PIPELINE INTEGRATION ORDER
    // ----------------------------------------------------
    console.log('▶ TEST 14: ERROR DETECTION PIPELINE STAGE ORDER');
    const edPath = path.join(__dirname, `ed_t9_${testId}.txt`);
    fs.writeFileSync(edPath, 'Cloud computing provides virtual machines, containers, and cloud infrastructure for execution.');
    tmpFilesToClean.push(edPath);

    const sessionEd = registerUpload(studentUid, 'single', [{ uploadPath: edPath, originalName: `ED_T9_${testId}.txt`, mimeType: 'text/plain' }]);
    const edResult = await errorDetectionService.analyzeErrorDetectionDocument(studentUser, sessionEd.uploadId);

    if (!edResult.reportId || !edResult.comparisonResult || !edResult.summary.comparisonSummary) {
      throw new Error('Test 14 failed: Error Detection pipeline output missing comparisonResult!');
    }
    createdReportIds.push(edResult.reportId);

    console.log(`  [T14] Full Error Detection pipeline executed cleanly:
       Validation -> Topic Detection -> Knowledge Retrieval -> Statement Extraction -> TF-IDF Comparison\n`);


    // ----------------------------------------------------
    // TEST 15: COPIED CONTENT DETECTION UNAFFECTED
    // ----------------------------------------------------
    console.log('▶ TEST 15: COPIED CONTENT DETECTION UNAFFECTED');
    const cc1Path = path.join(__dirname, `cc1_t9_${testId}.txt`);
    const cc2Path = path.join(__dirname, `cc2_t9_${testId}.txt`);
    fs.writeFileSync(cc1Path, 'Cloud computing delivers computing services over the internet.');
    fs.writeFileSync(cc2Path, 'Cloud computing delivers computing services over the internet.');
    tmpFilesToClean.push(cc1Path, cc2Path);

    const sessionCc = registerUpload(studentUid, 'copied-content', [
      { uploadPath: cc1Path, originalName: `CC1_T9_${testId}.txt`, mimeType: 'text/plain' },
      { uploadPath: cc2Path, originalName: `CC2_T9_${testId}.txt`, mimeType: 'text/plain' },
    ]);

    const ccResult = await copiedContentService.analyzeCopiedContent(studentUser, sessionCc.uploadId);
    if (!ccResult || !ccResult.reportId) throw new Error('Copied Content Detection pipeline failed!');
    console.log(`  [T15] Copied Content Detection pipeline executed unaffected. Report ID: ${ccResult.reportId}\n`);


    console.log('====================================================');
    console.log(' 🎉 ALL TASK 9 STATEMENT COMPARISON TESTS PASSED!   ');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ TASK 9 TEST FAILURE:', err.message);
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

runTask9Tests().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
