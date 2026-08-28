const { getDb } = require('../config/firebaseAdmin');
const {
  extractAndPrepareStatements,
  normalizeTextForExtraction,
  segmentParagraphIntoSentences,
  cleanAndMergeLines,
  checkIsNoise,
} = require('../services/errorDetection/statementExtractionService');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const path = require('path');
const fs = require('fs');

async function runE1ComprehensiveTestSuite() {
  console.log('====================================================');
  console.log(' TRUSTLENS E1: STATEMENT EXTRACTION & FRAGMENT FILTERING');
  console.log('====================================================\n');

  const db = getDb();
  const testId = Date.now();
  const studentUid = `student_e1_${testId}`;
  const studentUser = { uid: studentUid, name: 'E1 Student', email: `student_e1_${testId}@trustlens.edu`, role: 'student' };

  const createdReportIds = [];
  const tmpFilesToClean = [];

  let problematicFragmentsFiltered = 0;
  let validClaimsPreserved = 0;

  try {
    // ----------------------------------------------------
    // TEST 1: Colon introductory fragment combination
    // ----------------------------------------------------
    console.log('▶ TEST 1: COLON INTRODUCTORY FRAGMENT COMBINATION');
    const input1 = "The two extremes are:\npublic cloud and private cloud.";
    const res1 = extractAndPrepareStatements(input1, { documentId: 'doc1', documentName: 'T1.pdf' });

    if (res1.readyStatements.length !== 1) {
      throw new Error(`Test 1 failed: Expected 1 merged statement, got ${res1.readyStatements.length}`);
    }
    if (res1.readyStatements[0].text !== "The two extremes are public cloud and private cloud.") {
      throw new Error(`Test 1 failed: Unexpected text '${res1.readyStatements[0].text}'`);
    }
    validClaimsPreserved += res1.readyStatements.length;
    console.log(`  [PASS] Combined into single meaningful statement: "${res1.readyStatements[0].text}"\n`);

    // ----------------------------------------------------
    // TEST 2: Heading colon fragment combination
    // ----------------------------------------------------
    console.log('▶ TEST 2: HEADING COLON FRAGMENT COMBINATION');
    const input2 = "Advantages include:\nfast processing and scalability.";
    const res2 = extractAndPrepareStatements(input2, { documentId: 'doc2', documentName: 'T2.pdf' });

    if (res2.readyStatements.length !== 1) {
      throw new Error(`Test 2 failed: Expected 1 merged statement, got ${res2.readyStatements.length}`);
    }
    if (res2.readyStatements[0].text !== "Advantages include fast processing and scalability.") {
      throw new Error(`Test 2 failed: Unexpected text '${res2.readyStatements[0].text}'`);
    }
    validClaimsPreserved += res2.readyStatements.length;
    console.log(`  [PASS] Heading/fragment merged properly: "${res2.readyStatements[0].text}"\n`);

    // ----------------------------------------------------
    // TEST 3: Soft line breaks within sentence
    // ----------------------------------------------------
    console.log('▶ TEST 3: PDF LINE BREAKS WITHIN SENTENCE');
    const input3 = "TCP provides reliable communication\nbetween applications.";
    const res3 = extractAndPrepareStatements(input3, { documentId: 'doc3', documentName: 'T3.pdf' });

    if (res3.readyStatements.length !== 1) {
      throw new Error(`Test 3 failed: Expected 1 statement, got ${res3.readyStatements.length}`);
    }
    if (res3.readyStatements[0].text !== "TCP provides reliable communication between applications.") {
      throw new Error(`Test 3 failed: Line breaks not merged: '${res3.readyStatements[0].text}'`);
    }
    validClaimsPreserved += res3.readyStatements.length;
    console.log(`  [PASS] Multi-line sentence merged seamlessly: "${res3.readyStatements[0].text}"\n`);

    // ----------------------------------------------------
    // TEST 4: Standalone short heading/word filtering
    // ----------------------------------------------------
    console.log('▶ TEST 4: STANDALONE SHORT HEADING/WORD FILTERING');
    const input4 = "Database";
    const res4 = extractAndPrepareStatements(input4, { documentId: 'doc4', documentName: 'T4.pdf' });

    if (res4.readyStatements.length !== 0) {
      throw new Error(`Test 4 failed: "Database" should have been filtered, got ${res4.readyStatements.length} ready statements`);
    }
    if (res4.ignoredStatements.length === 0 || res4.ignoredStatements[0].reason !== 'fragment') {
      throw new Error('Test 4 failed: "Database" not flagged as fragment.');
    }
    problematicFragmentsFiltered += res4.ignoredStatements.length;
    console.log(`  [PASS] Standalone word "Database" correctly filtered as fragment\n`);

    // ----------------------------------------------------
    // TEST 5: Short meaningful claim preservation
    // ----------------------------------------------------
    console.log('▶ TEST 5: SHORT MEANINGFUL CLAIM PRESERVATION');
    const input5 = "TCP is reliable.";
    const res5 = extractAndPrepareStatements(input5, { documentId: 'doc5', documentName: 'T5.pdf' });

    if (res5.readyStatements.length !== 1 || res5.readyStatements[0].text !== "TCP is reliable.") {
      throw new Error(`Test 5 failed: Short valid statement was not preserved!`);
    }
    validClaimsPreserved += res5.readyStatements.length;
    console.log(`  [PASS] Short valid claim preserved: "${res5.readyStatements[0].text}"\n`);

    // ----------------------------------------------------
    // TEST 6: Step numbering handling
    // ----------------------------------------------------
    console.log('▶ TEST 6: NUMBERED STEP PREFIX HANDLING');
    const input6 = "Step 1:\nConfigure the network.";
    const res6 = extractAndPrepareStatements(input6, { documentId: 'doc6', documentName: 'T6.pdf' });

    if (res6.readyStatements.length !== 1 || res6.readyStatements[0].text !== "Configure the network.") {
      throw new Error(`Test 6 failed: Step numbering not cleanly separated! Got '${res6.readyStatements[0]?.text}'`);
    }
    validClaimsPreserved += res6.readyStatements.length;
    console.log(`  [PASS] "Step 1:" prefix stripped cleanly, statement retained: "${res6.readyStatements[0].text}"\n`);

    // ----------------------------------------------------
    // TEST 7: Bullet point statement preservation
    // ----------------------------------------------------
    console.log('▶ TEST 7: BULLET POINT STATEMENT PRESERVATION');
    const input7 = "• TCP provides reliable delivery.";
    const res7 = extractAndPrepareStatements(input7, { documentId: 'doc7', documentName: 'T7.pdf' });

    if (res7.readyStatements.length !== 1 || res7.readyStatements[0].text !== "TCP provides reliable delivery.") {
      throw new Error(`Test 7 failed: Bullet marker not stripped or statement altered! Got '${res7.readyStatements[0]?.text}'`);
    }
    validClaimsPreserved += res7.readyStatements.length;
    console.log(`  [PASS] Bullet point statement cleanly extracted: "${res7.readyStatements[0].text}"\n`);

    // ----------------------------------------------------
    // TEST 8: Repeated page headers filtering
    // ----------------------------------------------------
    console.log('▶ TEST 8: REPEATED PAGE HEADERS FILTERING');
    const input8 = [
      "TrustLens Computer Science Notes",
      "TCP is connection-oriented.",
      "TrustLens Computer Science Notes",
      "UDP is connectionless.",
      "TrustLens Computer Science Notes"
    ].join('\n\n');
    const res8 = extractAndPrepareStatements(input8, { documentId: 'doc8', documentName: 'T8.pdf' });

    const headerStatements = res8.readyStatements.filter(s => s.text.includes('TrustLens Computer Science Notes'));
    if (headerStatements.length > 0) {
      throw new Error('Test 8 failed: Repeated page header was included as a factual claim!');
    }
    if (res8.readyStatements.length !== 2) {
      throw new Error(`Test 8 failed: Expected 2 statements, got ${res8.readyStatements.length}`);
    }
    validClaimsPreserved += res8.readyStatements.length;
    console.log(`  [PASS] Repeated page headers filtered cleanly; valid statements retained (2)\n`);

    // ----------------------------------------------------
    // TEST 9: Long paragraph with multiple sentences
    // ----------------------------------------------------
    console.log('▶ TEST 9: LONG PARAGRAPH MULTIPLE STATEMENTS');
    const input9 = "The Transmission Control Protocol operates at the transport layer. It provides connection-oriented communication. In contrast, UDP provides connectionless delivery.";
    const res9 = extractAndPrepareStatements(input9, { documentId: 'doc9', documentName: 'T9.pdf' });

    if (res9.readyStatements.length !== 3) {
      throw new Error(`Test 9 failed: Expected 3 statements from paragraph, got ${res9.readyStatements.length}`);
    }
    validClaimsPreserved += res9.readyStatements.length;
    console.log(`  [PASS] Long paragraph cleanly segmented into 3 complete statements\n`);

    // ----------------------------------------------------
    // TEST 10: Empty text & malformed input safety
    // ----------------------------------------------------
    console.log('▶ TEST 10: EMPTY AND MALFORMED INPUT SAFETY');
    const res10a = extractAndPrepareStatements("", { documentId: 'doc10a', documentName: 'Empty.pdf' });
    const res10b = extractAndPrepareStatements(null, { documentId: 'doc10b', documentName: 'Null.pdf' });

    if (!res10a.success || res10a.readyStatements.length !== 0 || !res10b.success || res10b.readyStatements.length !== 0) {
      throw new Error('Test 10 failed: Empty/null input handling failed.');
    }
    console.log('  [PASS] Empty/null input safely returns 0 ready statements without crashing\n');

    // ----------------------------------------------------
    // TEST 11: End-to-end Error Detection pipeline integration
    // ----------------------------------------------------
    console.log('▶ TEST 11: END-TO-END ERROR DETECTION PIPELINE INTEGRATION');
    const edFilePath = path.join(__dirname, `e1_ed_${testId}.txt`);
    fs.writeFileSync(edFilePath, [
      "The two extremes are:",
      "public cloud and private cloud.",
      "",
      "• TCP provides reliable delivery.",
      "",
      "Database",
      "",
      "Step 1:",
      "Configure the network.",
      "",
      "TCP is connection-oriented.",
    ].join('\n'));
    tmpFilesToClean.push(edFilePath);

    const sessionEd = registerUpload(studentUid, 'single', [{ uploadPath: edFilePath, originalName: `E1_Doc_${testId}.txt`, mimeType: 'text/plain' }]);
    const edResult = await errorDetectionService.analyzeErrorDetectionDocument(studentUser, sessionEd.uploadId);

    if (!edResult.reportId || !edResult.summary) {
      throw new Error('Test 11 failed: Error detection analysis failed to produce report!');
    }
    createdReportIds.push(edResult.reportId);

    console.log(`  [PASS] Pipeline executed cleanly. Saved Report ID: ${edResult.reportId}`);
    console.log(`  [INFO] Total statements fact-checked: ${edResult.summary.totalStatements}`);
    console.log(`  [INFO] Statement summary: ${JSON.stringify(edResult.summary.statementSummary)}\n`);

    // ----------------------------------------------------
    // TEST 12: Regression check — Copied Content Detection
    // ----------------------------------------------------
    console.log('▶ TEST 12: REGRESSION CHECK — COPIED CONTENT DETECTION UNAFFECTED');
    const cc1Path = path.join(__dirname, `e1_cc1_${testId}.txt`);
    const cc2Path = path.join(__dirname, `e1_cc2_${testId}.txt`);
    fs.writeFileSync(cc1Path, 'Data structures organize and store data for efficient access across systems.');
    fs.writeFileSync(cc2Path, 'Data structures store and organize data for efficient access across systems.');
    tmpFilesToClean.push(cc1Path, cc2Path);

    const sessionCc = registerUpload(studentUid, 'copied-content', [
      { uploadPath: cc1Path, originalName: `CC1_${testId}.txt`, mimeType: 'text/plain' },
      { uploadPath: cc2Path, originalName: `CC2_${testId}.txt`, mimeType: 'text/plain' },
    ]);

    const ccResult = await copiedContentService.analyzeCopiedContent(studentUser, sessionCc.uploadId);
    if (!ccResult || !ccResult.reportId) throw new Error('Copied Content Detection failed!');
    console.log(`  [PASS] Copied Content Detection executed unaffected. Report ID: ${ccResult.reportId}\n`);

    console.log('====================================================');
    console.log(' 🎉 ALL E1 TEST CASES PASSED SUCCESSFULLY!          ');
    console.log(` 📊 Total Problematic Fragments Filtered: ${problematicFragmentsFiltered}`);
    console.log(` 📊 Total Valid Factual Claims Preserved: ${validClaimsPreserved}`);
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ E1 TEST FAILURE:', err.message);
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

runE1ComprehensiveTestSuite().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
