const { getDb } = require('../config/firebaseAdmin');
const { compareStatementsToKnowledge } = require('../services/errorDetection/statementComparisonService');
const { classifyStatements, classifyStatementComparison } = require('../services/errorDetection/errorClassificationService');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const { FACTUAL_CLASSIFICATION } = require('../constants/domainConstants');
const path = require('path');
const fs = require('fs');

async function runTask10Tests() {
  console.log('====================================================');
  console.log(' TRUSTLENS TASK 10: FACTUAL CLASSIFICATION TEST    ');
  console.log('====================================================\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not initialized.');
    process.exit(1);
  }

  const testId = Date.now();
  const studentUid = `student_task10_${testId}`;
  const studentUser = { uid: studentUid, name: 'Task 10 Student', email: `student_t10_${testId}@trustlens.edu`, role: 'student' };

  const createdReportIds = [];
  const tmpFilesToClean = [];

  try {
    const kSources = [
      { id: 'k1', sourceId: 'src_tcp', title: 'TCP Overview', content: 'TCP is a connection-oriented transport protocol providing reliable delivery.', topics: ['Computer Networks'] },
      { id: 'k2', sourceId: 'src_udp', title: 'UDP Overview', content: 'UDP is a connectionless transport protocol providing low latency delivery.', topics: ['Computer Networks'] },
      { id: 'k3', sourceId: 'src_ipv4', title: 'IPv4 Addressing', content: 'IPv4 addresses contain 32 bits for network identification.', topics: ['Computer Networks'] },
      { id: 'k4', sourceId: 'src_ram', title: 'RAM Memory', content: 'RAM is volatile memory used for main system storage.', topics: ['Computer Architecture'] },
      { id: 'k5', sourceId: 'src_sql', title: 'SQL ACID', content: 'SQL databases can support ACID properties for transactions.', topics: ['Database Management Systems'] },
    ];

    // ----------------------------------------------------
    // TEST 1: SUPPORTED CLASSIFICATION
    // ----------------------------------------------------
    console.log('▶ TEST 1: SUPPORTED CLASSIFICATION');
    const comp1 = compareStatementsToKnowledge([{ id: 's1', text: 'TCP is a connection-oriented protocol.' }], [kSources[0]]);
    const res1 = classifyStatements(comp1);
    const r1 = res1.results[0];

    if (r1.classification !== FACTUAL_CLASSIFICATION.SUPPORTED) {
      throw new Error(`Test 1 failed: Expected SUPPORTED, got ${r1.classification}`);
    }
    console.log(`  [T1] Verified SUPPORTED classification. Reason: ${r1.classificationReason}\n`);


    // ----------------------------------------------------
    // TEST 2: PARAPHRASED SUPPORTED
    // ----------------------------------------------------
    console.log('▶ TEST 2: PARAPHRASED SUPPORTED');
    const comp2 = compareStatementsToKnowledge([{ id: 's2', text: 'TCP establishes a connection before transmitting data.' }], [kSources[0]]);
    const res2 = classifyStatements(comp2);
    const r2 = res2.results[0];

    if (r2.classification !== FACTUAL_CLASSIFICATION.SUPPORTED) {
      throw new Error(`Test 2 failed: Expected SUPPORTED for paraphrase, got ${r2.classification}`);
    }
    console.log(`  [T2] Paraphrased statement classified as SUPPORTED cleanly\n`);


    // ----------------------------------------------------
    // TEST 3: DIRECT CONTRADICTION (PROPERTY REVERSAL)
    // ----------------------------------------------------
    console.log('▶ TEST 3: DIRECT CONTRADICTION (PROPERTY REVERSAL)');
    const comp3 = compareStatementsToKnowledge([{ id: 's3', text: 'TCP is a connectionless protocol.' }], [kSources[0]]);
    const res3 = classifyStatements(comp3);
    const r3 = res3.results[0];

    if (r3.classification !== FACTUAL_CLASSIFICATION.INCORRECT) {
      throw new Error(`Test 3 failed: Expected INCORRECT for property reversal, got ${r3.classification}`);
    }
    console.log(`  [T3] Direct property contradiction classified as INCORRECT. Reason: ${r3.classificationReason}\n`);


    // ----------------------------------------------------
    // TEST 4: NEGATION CONTRADICTION
    // ----------------------------------------------------
    console.log('▶ TEST 4: NEGATION CONTRADICTION');
    const comp4 = compareStatementsToKnowledge([{ id: 's4', text: 'TCP is not a connection-oriented protocol.' }], [kSources[0]]);
    const res4 = classifyStatements(comp4);
    const r4 = res4.results[0];

    if (r4.classification !== FACTUAL_CLASSIFICATION.INCORRECT) {
      throw new Error(`Test 4 failed: Expected INCORRECT for negation, got ${r4.classification}`);
    }
    console.log(`  [T4] Negated statement classified as INCORRECT. Reason: ${r4.classificationReason}\n`);


    // ----------------------------------------------------
    // TEST 5: NUMERIC CONTRADICTION
    // ----------------------------------------------------
    console.log('▶ TEST 5: NUMERIC CONTRADICTION');
    const comp5 = compareStatementsToKnowledge([{ id: 's5', text: 'IPv4 addresses contain 64 bits.' }], [kSources[2]]);
    const res5 = classifyStatements(comp5);
    const r5 = res5.results[0];

    if (r5.classification !== FACTUAL_CLASSIFICATION.INCORRECT) {
      throw new Error(`Test 5 failed: Expected INCORRECT for numeric mismatch, got ${r5.classification}`);
    }
    console.log(`  [T5] Numeric mismatch classified as INCORRECT. Reason: ${r5.classificationReason}\n`);


    // ----------------------------------------------------
    // TEST 6: NUMERIC SUPPORT
    // ----------------------------------------------------
    console.log('▶ TEST 6: NUMERIC SUPPORT');
    const comp6 = compareStatementsToKnowledge([{ id: 's6', text: 'IPv4 uses 32-bit addresses.' }], [kSources[2]]);
    const res6 = classifyStatements(comp6);
    const r6 = res6.results[0];

    if (r6.classification !== FACTUAL_CLASSIFICATION.SUPPORTED) {
      throw new Error(`Test 6 failed: Expected SUPPORTED for matching numeric value, got ${r6.classification}`);
    }
    console.log(`  [T6] Numeric value agreement classified as SUPPORTED\n`);


    // ----------------------------------------------------
    // TEST 7: PROPERTY CONTRADICTION (VOLATILITY)
    // ----------------------------------------------------
    console.log('▶ TEST 7: PROPERTY CONTRADICTION (VOLATILITY)');
    const comp7 = compareStatementsToKnowledge([{ id: 's7', text: 'RAM is non-volatile memory.' }], [kSources[3]]);
    const res7 = classifyStatements(comp7);
    const r7 = res7.results[0];

    if (r7.classification !== FACTUAL_CLASSIFICATION.INCORRECT) {
      throw new Error(`Test 7 failed: Expected INCORRECT for RAM volatility reversal, got ${r7.classification}`);
    }
    console.log(`  [T7] Volatility property reversal classified as INCORRECT\n`);


    // ----------------------------------------------------
    // TEST 8: UNSUPPORTED CLAIM
    // ----------------------------------------------------
    console.log('▶ TEST 8: UNSUPPORTED CLAIM');
    const comp8 = compareStatementsToKnowledge([{ id: 's8', text: 'TCP reduces network latency by exactly 37%.' }], [kSources[0]]);
    const res8 = classifyStatements(comp8);
    const r8 = res8.results[0];

    if (r8.classification !== FACTUAL_CLASSIFICATION.UNSUPPORTED) {
      throw new Error(`Test 8 failed: Expected UNSUPPORTED for unevidenced claim, got ${r8.classification}`);
    }
    console.log(`  [T8] Unevidenced claim classified as UNSUPPORTED\n`);


    // ----------------------------------------------------
    // TEST 9: NO KNOWLEDGE AVAILABLE
    // ----------------------------------------------------
    console.log('▶ TEST 9: NO KNOWLEDGE AVAILABLE');
    const comp9 = compareStatementsToKnowledge([{ id: 's9', text: 'Quantum networking uses entangled photons.' }], []);
    const res9 = classifyStatements(comp9);
    const r9 = res9.results[0];

    if (r9.classification !== FACTUAL_CLASSIFICATION.NO_KNOWLEDGE_AVAILABLE) {
      throw new Error(`Test 9 failed: Expected NO_KNOWLEDGE_AVAILABLE, got ${r9.classification}`);
    }
    console.log(`  [T9] Missing knowledge topic classified as NO_KNOWLEDGE_AVAILABLE\n`);


    // ----------------------------------------------------
    // TEST 10: MISLEADING ABSOLUTE CLAIM
    // ----------------------------------------------------
    console.log('▶ TEST 10: MISLEADING ABSOLUTE CLAIM');
    const comp10 = compareStatementsToKnowledge([{ id: 's10', text: 'SQL databases always guarantee ACID properties in every situation.' }], [kSources[4]]);
    const res10 = classifyStatements(comp10);
    const r10 = res10.results[0];

    if (r10.classification !== FACTUAL_CLASSIFICATION.MISLEADING) {
      throw new Error(`Test 10 failed: Expected MISLEADING for absolute claim, got ${r10.classification}`);
    }
    console.log(`  [T10] Overgeneralizing absolute claim classified as MISLEADING. Reason: ${r10.classificationReason}\n`);


    // ----------------------------------------------------
    // TEST 11: HIGH SIMILARITY BUT CONTRADICTION (MANDATORY RULE)
    // ----------------------------------------------------
    console.log('▶ TEST 11: HIGH SIMILARITY BUT CONTRADICTION');
    const comp11 = compareStatementsToKnowledge([{ id: 's11', text: 'UDP is not connectionless.' }], [kSources[1]]);
    const res11 = classifyStatements(comp11);
    const r11 = res11.results[0];

    if (r11.comparison.similarity < 0.35) {
      throw new Error(`Test 11 precondition failed: Similarity should be above threshold, got ${r11.comparison.similarity}`);
    }
    if (r11.classification !== FACTUAL_CLASSIFICATION.INCORRECT) {
      throw new Error(`Test 11 MANDATORY RULE FAILED: High similarity with negation was NOT classified as INCORRECT! Got ${r11.classification}`);
    }
    console.log(`  [T11] MANDATORY RULE VERIFIED: High similarity (${r11.comparison.similarity}) + negation classified as INCORRECT\n`);


    // ----------------------------------------------------
    // TEST 12: LOW SIMILARITY MATCH
    // ----------------------------------------------------
    console.log('▶ TEST 12: LOW SIMILARITY MATCH');
    const comp12 = compareStatementsToKnowledge([{ id: 's12', text: 'DNS translates domain names.' }], [kSources[4]]);
    const res12 = classifyStatements(comp12);
    const r12 = res12.results[0];

    if (r12.classification !== FACTUAL_CLASSIFICATION.UNSUPPORTED) {
      throw new Error(`Test 12 failed: Low similarity match should be UNSUPPORTED, got ${r12.classification}`);
    }
    console.log(`  [T12] Weak similarity match classified as UNSUPPORTED\n`);


    // ----------------------------------------------------
    // TEST 13: MULTIPLE STATEMENTS BATCH
    // ----------------------------------------------------
    console.log('▶ TEST 13: MULTIPLE STATEMENTS BATCH');
    const batchStmts = [
      { id: 'b1', text: 'TCP is a connection-oriented protocol.' },
      { id: 'b2', text: 'TCP is connectionless.' },
      { id: 'b3', text: 'RAM is volatile memory.' },
      { id: 'b4', text: 'IPv4 uses 64-bit addresses.' },
      { id: 'b5', text: 'SQL databases always guarantee ACID in all cases.' },
      { id: 'b6', text: 'Quantum circuits process qubits.' },
      { id: 'b7', text: 'UDP is a connectionless transport protocol.' },
      { id: 'b8', text: 'IPv4 uses 32-bit addresses.' },
      { id: 'b9', text: 'TCP is not connection-oriented.' },
      { id: 'b10', text: 'RAM is non-volatile memory.' },
    ];
    const comp13 = compareStatementsToKnowledge(batchStmts, kSources);
    const res13 = classifyStatements(comp13);

    if (res13.totalClassified !== 10 || !res13.summary) {
      throw new Error('Test 13 failed: Batch classification count or summary missing.');
    }
    console.log(`  [T13] Batch of 10 statements classified cleanly. Summary:`, res13.summary, '\n');


    // ----------------------------------------------------
    // TEST 14: MULTIPLE DOCUMENTS INDEPENDENT CLASSIFICATION
    // ----------------------------------------------------
    console.log('▶ TEST 14: MULTIPLE DOCUMENTS INDEPENDENT CLASSIFICATION');
    const compDocA = compareStatementsToKnowledge([{ id: 'da', documentId: 'docA', text: 'TCP is connection-oriented.' }], [kSources[0]]);
    const compDocB = compareStatementsToKnowledge([{ id: 'db', documentId: 'docB', text: 'TCP is connectionless.' }], [kSources[0]]);
    const resDocA = classifyStatements(compDocA);
    const resDocB = classifyStatements(compDocB);

    if (resDocA.results[0].classification === resDocB.results[0].classification) {
      throw new Error('Test 14 failed: Multi-document classifications leaked.');
    }
    console.log(`  [T14] Independent doc classification verified: Doc A = ${resDocA.results[0].classification}, Doc B = ${resDocB.results[0].classification}\n`);


    // ----------------------------------------------------
    // TEST 15: TECHNICAL CS TERMINOLOGY PRESERVATION
    // ----------------------------------------------------
    console.log('▶ TEST 15: TECHNICAL CS TERMINOLOGY PRESERVATION');
    const comp15 = compareStatementsToKnowledge([{ id: 's15', text: 'HTTP, HTTPS, DBMS, and ACID are foundational Computer Science concepts.' }], kSources);
    const res15 = classifyStatements(comp15);
    if (!res15.success || res15.results.length !== 1) {
      throw new Error('Test 15 failed: CS terms broke classification pipeline.');
    }
    console.log('  [T15] Technical CS terminology preserved cleanly during error classification\n');


    // ----------------------------------------------------
    // TEST 16: MALFORMED KNOWLEDGE FALLBACK
    // ----------------------------------------------------
    console.log('▶ TEST 16: MALFORMED KNOWLEDGE FALLBACK');
    const res16 = classifyStatementComparison(null);
    if (res16.classification !== FACTUAL_CLASSIFICATION.UNSUPPORTED) {
      throw new Error('Test 16 failed: Malformed input failed fallback to UNSUPPORTED.');
    }
    console.log('  [T16] Malformed input safely fell back to UNSUPPORTED\n');


    // ----------------------------------------------------
    // TEST 17: INVALID SIMILARITY SCORE HANDLING (NaN)
    // ----------------------------------------------------
    console.log('▶ TEST 17: INVALID SIMILARITY SCORE HANDLING');
    const itemNan = { statementId: 'snan', statementText: 'TCP test', comparisonStatus: 'matched', bestMatch: { similarity: NaN } };
    const res17 = classifyStatementComparison(itemNan);
    if (res17.classification !== FACTUAL_CLASSIFICATION.UNSUPPORTED || isNaN(res17.comparison.similarity)) {
      throw new Error('Test 17 failed: NaN similarity broke classification safety.');
    }
    console.log('  [T17] NaN similarity score safely handled without crash\n');


    // ----------------------------------------------------
    // TEST 18: COPIED CONTENT DETECTION UNAFFECTED
    // ----------------------------------------------------
    console.log('▶ TEST 18: COPIED CONTENT DETECTION UNAFFECTED');
    const cc1Path = path.join(__dirname, `cc1_t10_${testId}.txt`);
    const cc2Path = path.join(__dirname, `cc2_t10_${testId}.txt`);
    fs.writeFileSync(cc1Path, 'Cloud computing provides virtual resources.');
    fs.writeFileSync(cc2Path, 'Cloud computing provides virtual resources.');
    tmpFilesToClean.push(cc1Path, cc2Path);

    const sessionCc = registerUpload(studentUid, 'copied-content', [
      { uploadPath: cc1Path, originalName: `CC1_T10_${testId}.txt`, mimeType: 'text/plain' },
      { uploadPath: cc2Path, originalName: `CC2_T10_${testId}.txt`, mimeType: 'text/plain' },
    ]);

    const ccResult = await copiedContentService.analyzeCopiedContent(studentUser, sessionCc.uploadId);
    if (!ccResult || !ccResult.reportId) throw new Error('Copied Content Detection pipeline failed!');
    console.log(`  [T18] Copied Content Detection pipeline executed unaffected. Report ID: ${ccResult.reportId}\n`);


    console.log('====================================================');
    console.log(' 🎉 ALL TASK 10 FACTUAL CLASSIFICATION TESTS PASSED!');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ TASK 10 TEST FAILURE:', err.message);
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

runTask10Tests().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
