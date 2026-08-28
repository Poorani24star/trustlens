const { getDb } = require('../config/firebaseAdmin');
const { extractAndPrepareStatements, normalizeTextForExtraction, segmentParagraphIntoSentences, checkIsNoise } = require('../services/errorDetection/statementExtractionService');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const path = require('path');
const fs = require('fs');

async function runTask8Tests() {
  console.log('====================================================');
  console.log(' TRUSTLENS TASK 8: STATEMENT EXTRACTION TEST       ');
  console.log('====================================================\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not initialized.');
    process.exit(1);
  }

  const testId = Date.now();
  const studentUid = `student_task8_${testId}`;
  const studentUser = { uid: studentUid, name: 'Task 8 Student', email: `student_t8_${testId}@trustlens.edu`, role: 'student' };

  const createdReportIds = [];
  const tmpFilesToClean = [];

  try {
    // ----------------------------------------------------
    // TEST 1: SIMPLE DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 1: SIMPLE DOCUMENT');
    const input1 = "TCP is connection-oriented. UDP is connectionless.";
    const res1 = extractAndPrepareStatements(input1, { documentId: 'doc1', documentName: 'Simple.txt' });

    if (!res1.success || res1.readyStatements.length !== 2) {
      throw new Error(`Test 1 failed: Expected 2 ready statements, got ${res1.readyStatements.length}`);
    }
    if (res1.readyStatements[0].text !== "TCP is connection-oriented." || res1.readyStatements[1].text !== "UDP is connectionless.") {
      throw new Error('Test 1 failed: Extracted statement wording mismatch.');
    }
    console.log(`  [T1] Extracted ${res1.readyStatements.length} statements cleanly from simple text\n`);


    // ----------------------------------------------------
    // TEST 2: MULTIPLE PARAGRAPHS
    // ----------------------------------------------------
    console.log('▶ TEST 2: MULTIPLE PARAGRAPHS');
    const input2 = "Cloud computing provides on-demand access.\n\nVirtual machines provide isolation.";
    const res2 = extractAndPrepareStatements(input2, { documentId: 'doc2', documentName: 'Paragraphs.txt' });

    if (res2.readyStatements.length !== 2) throw new Error('Test 2 failed: Expected 2 statements from 2 paragraphs.');
    if (res2.readyStatements[0].paragraphIndex !== 1 || res2.readyStatements[1].paragraphIndex !== 2) {
      throw new Error('Test 2 failed: Paragraph indexing mismatch.');
    }
    console.log('  [T2] Paragraph separation and paragraph indexing preserved correctly\n');


    // ----------------------------------------------------
    // TEST 3: BULLET LIST
    // ----------------------------------------------------
    console.log('▶ TEST 3: BULLET LIST');
    const input3 = "- TCP is connection-oriented.\n- UDP is connectionless.\n- DNS maps domain names to IP addresses.";
    const res3 = extractAndPrepareStatements(input3, { documentId: 'doc3', documentName: 'Bullets.txt' });

    if (res3.readyStatements.length !== 3) {
      throw new Error(`Test 3 failed: Expected 3 ready statements from bullet list, got ${res3.readyStatements.length}`);
    }
    console.log(`  [T3] Extracted ${res3.readyStatements.length} bullet list items as individual statements\n`);


    // ----------------------------------------------------
    // TEST 4: TECHNICAL ABBREVIATIONS
    // ----------------------------------------------------
    console.log('▶ TEST 4: TECHNICAL ABBREVIATIONS');
    const input4 = "TCP/IP is widely used in computer networks.";
    const res4 = extractAndPrepareStatements(input4, { documentId: 'doc4', documentName: 'Abbr.txt' });

    if (res4.readyStatements.length !== 1 || !res4.readyStatements[0].text.includes('TCP/IP')) {
      throw new Error('Test 4 failed: Technical abbreviation TCP/IP was incorrectly split.');
    }
    console.log('  [T4] Technical slash term "TCP/IP" protected from incorrect segmentation\n');


    // ----------------------------------------------------
    // TEST 5: DECIMAL NUMBERS
    // ----------------------------------------------------
    console.log('▶ TEST 5: DECIMAL NUMBERS');
    const input5 = "Python 3.12 introduced several improvements.";
    const res5 = extractAndPrepareStatements(input5, { documentId: 'doc5', documentName: 'Decimal.txt' });

    if (res5.readyStatements.length !== 1 || !res5.readyStatements[0].text.includes('3.12')) {
      throw new Error('Test 5 failed: Decimal number 3.12 was incorrectly split.');
    }
    console.log('  [T5] Decimal number "3.12" protected from sentence boundary splitting\n');


    // ----------------------------------------------------
    // TEST 6: HEADINGS FILTERING
    // ----------------------------------------------------
    console.log('▶ TEST 6: HEADINGS FILTERING');
    const input6 = "Computer Networks\n\nTCP is a connection-oriented protocol.";
    const res6 = extractAndPrepareStatements(input6, { documentId: 'doc6', documentName: 'Headings.txt' });

    const headings = res6.ignoredStatements.filter(s => s.reason === 'heading' || s.reason === 'fragment');
    if (headings.length === 0 || res6.readyStatements.length !== 1) {
      throw new Error('Test 6 failed: Heading was not ignored correctly.');
    }
    console.log('  [T6] Heading "Computer Networks" filtered to ignored while factual statement retained\n');


    // ----------------------------------------------------
    // TEST 7: SHORT FRAGMENTS FILTERING
    // ----------------------------------------------------
    console.log('▶ TEST 7: SHORT FRAGMENTS FILTERING');
    const input7 = "TCP\n\nDefinition\n\nTCP is connection-oriented.";
    const res7 = extractAndPrepareStatements(input7, { documentId: 'doc7', documentName: 'Fragments.txt' });

    if (res7.readyStatements.length !== 1 || res7.ignoredStatements.length < 2) {
      throw new Error('Test 7 failed: Meaningless fragments were not ignored.');
    }
    console.log('  [T7] Short meaningless fragments ("TCP", "Definition") filtered to ignored\n');


    // ----------------------------------------------------
    // TEST 8: MULTIPLE DOCUMENTS INDEPENDENT EXTRACTION
    // ----------------------------------------------------
    console.log('▶ TEST 8: MULTIPLE DOCUMENTS INDEPENDENT EXTRACTION');
    const docCloud = extractAndPrepareStatements("Cloud computing provides virtual machines.", { documentId: 'doc_cloud', documentName: 'Cloud.pdf' });
    const docDbms = extractAndPrepareStatements("Database management systems use SQL queries.", { documentId: 'doc_dbms', documentName: 'DBMS.pdf' });
    const docNet = extractAndPrepareStatements("Computer networks use TCP and IP protocols.", { documentId: 'doc_net', documentName: 'Net.pdf' });

    if (docCloud.documentId === docDbms.documentId || docCloud.readyStatements[0].documentId !== 'doc_cloud') {
      throw new Error('Test 8 failed: Multi-document statement extraction isolation failed.');
    }
    console.log(`  [T8] Extracted statements independently for 3 documents:
       - Cloud: ${docCloud.readyStatements.length} statements
       - DBMS:  ${docDbms.readyStatements.length} statements
       - Net:   ${docNet.readyStatements.length} statements\n`);


    // ----------------------------------------------------
    // TEST 9: DOCUMENT ASSOCIATION
    // ----------------------------------------------------
    console.log('▶ TEST 9: DOCUMENT ASSOCIATION');
    if (res1.readyStatements.some(s => s.documentId !== 'doc1' || s.documentName !== 'Simple.txt')) {
      throw new Error('Test 9 failed: Statements missing document reference.');
    }
    console.log('  [T9] All extracted statements explicitly retain documentId and documentName references\n');


    // ----------------------------------------------------
    // TEST 10: TOPIC ASSOCIATION
    // ----------------------------------------------------
    console.log('▶ TEST 10: TOPIC ASSOCIATION');
    const res10 = extractAndPrepareStatements("Cloud computing uses virtual machines.", {
      documentId: 'doc10',
      documentName: 'TopicTest.txt',
      topicDetection: { primaryTopic: 'Cloud Computing', detectedTopics: ['Cloud Computing'] },
    });

    if (res10.readyStatements[0].primaryTopic !== 'Cloud Computing') {
      throw new Error('Test 10 failed: Statement did not inherit topic metadata.');
    }
    console.log('  [T10] Statements inherited primaryTopic and detectedTopics metadata from Task 3\n');


    // ----------------------------------------------------
    // TEST 11: ORIGINAL WORDING PRESERVATION
    // ----------------------------------------------------
    console.log('▶ TEST 11: ORIGINAL WORDING PRESERVATION');
    const wrongFact = "TCP is connectionless.";
    const res11 = extractAndPrepareStatements(wrongFact, { documentId: 'doc11', documentName: 'Original.txt' });

    if (res11.readyStatements[0].text !== wrongFact) {
      throw new Error('Test 11 failed: System altered original statement text!');
    }
    console.log('  [T11] Original user wording preserved exactly without automatic grammar/spelling correction\n');


    // ----------------------------------------------------
    // TEST 12: CODE CONTENT HANDLING
    // ----------------------------------------------------
    console.log('▶ TEST 12: CODE CONTENT HANDLING');
    const input12 = "function connectSocket() {\n  return new Socket();\n}\n\nTCP is connection-oriented.";
    const res12 = extractAndPrepareStatements(input12, { documentId: 'doc12', documentName: 'Code.txt' });

    if (res12.readyStatements.length !== 1 || res12.readyStatements[0].text !== 'TCP is connection-oriented.') {
      throw new Error('Test 12 failed: Code block line was incorrectly treated as factual statement.');
    }
    console.log('  [T12] Code block lines ignored while valid technical statement retained cleanly\n');


    // ----------------------------------------------------
    // TEST 13: REFERENCES AND BIBLIOGRAPHY
    // ----------------------------------------------------
    console.log('▶ TEST 13: REFERENCES AND BIBLIOGRAPHY');
    const input13 = "TCP provides reliable delivery [3].\n\n[1] Author, Book Title, vol. 10, pp. 20-30, 2024 http://example.com";
    const res13 = extractAndPrepareStatements(input13, { documentId: 'doc13', documentName: 'Refs.txt' });

    if (res13.readyStatements.length !== 1 || !res13.readyStatements[0].text.includes('TCP provides reliable delivery')) {
      throw new Error('Test 13 failed: Standalone reference entry was not ignored.');
    }
    console.log('  [T13] Standalone reference entry ignored while inline citation statement retained\n');


    // ----------------------------------------------------
    // TEST 14: EMPTY DOCUMENT
    // ----------------------------------------------------
    console.log('▶ TEST 14: EMPTY DOCUMENT');
    const res14 = extractAndPrepareStatements("", { documentId: 'doc14', documentName: 'Empty.txt' });

    if (!res14.success || res14.readyStatements.length !== 0 || res14.totalCandidates !== 0) {
      throw new Error('Test 14 failed: Empty document did not return safe empty result.');
    }
    console.log('  [T14] Empty document returned safe empty result (0 ready statements)\n');


    // ----------------------------------------------------
    // TEST 15: EXTRACTION FAILURE / MALFORMED DATA
    // ----------------------------------------------------
    console.log('▶ TEST 15: EXTRACTION FAILURE / MALFORMED DATA');
    const res15 = extractAndPrepareStatements(null, { documentId: 'doc15', documentName: 'Malformed.txt' });

    if (!res15.success || res15.readyStatements.length !== 0) {
      throw new Error('Test 15 failed: Null text input caused unexpected failure.');
    }
    console.log('  [T15] Malformed input handled safely without throwing error\n');


    // ----------------------------------------------------
    // TEST 16: ERROR DETECTION PIPELINE INTEGRATION ORDER
    // ----------------------------------------------------
    console.log('▶ TEST 16: ERROR DETECTION PIPELINE STAGE ORDER');
    const edPath = path.join(__dirname, `ed_t8_${testId}.txt`);
    fs.writeFileSync(edPath, 'Cloud computing provides virtual machines, containers, and cloud infrastructure for execution.');
    tmpFilesToClean.push(edPath);

    const sessionEd = registerUpload(studentUid, 'single', [{ uploadPath: edPath, originalName: `ED_T8_${testId}.txt`, mimeType: 'text/plain' }]);
    const edResult = await errorDetectionService.analyzeErrorDetectionDocument(studentUser, sessionEd.uploadId);

    if (!edResult.reportId || !edResult.summary || !edResult.summary.statementSummary) {
      throw new Error('Test 16 failed: Report summary missing statementSummary metadata!');
    }
    createdReportIds.push(edResult.reportId);

    const stmtSummary = edResult.summary.statementSummary;
    if (typeof stmtSummary.readyStatements !== 'number' || stmtSummary.readyStatements === 0) {
      throw new Error('Test 16 failed: statementSummary structure invalid.');
    }
    console.log(`  [T16] Error Detection pipeline executed: Validation -> Topic Detection -> Knowledge Retrieval -> Statement Extraction (Ready: ${stmtSummary.readyStatements})\n`);


    // ----------------------------------------------------
    // TEST 17: COPIED CONTENT DETECTION UNAFFECTED
    // ----------------------------------------------------
    console.log('▶ TEST 17: COPIED CONTENT DETECTION UNAFFECTED');
    const cc1Path = path.join(__dirname, `cc1_t8_${testId}.txt`);
    const cc2Path = path.join(__dirname, `cc2_t8_${testId}.txt`);
    fs.writeFileSync(cc1Path, 'Data structures organize and store data for efficient access.');
    fs.writeFileSync(cc2Path, 'Data structures store and organize data for efficient access.');
    tmpFilesToClean.push(cc1Path, cc2Path);

    const sessionCc = registerUpload(studentUid, 'copied-content', [
      { uploadPath: cc1Path, originalName: `CC1_T8_${testId}.txt`, mimeType: 'text/plain' },
      { uploadPath: cc2Path, originalName: `CC2_T8_${testId}.txt`, mimeType: 'text/plain' },
    ]);

    const ccResult = await copiedContentService.analyzeCopiedContent(studentUser, sessionCc.uploadId);
    if (!ccResult || !ccResult.reportId) throw new Error('Copied Content Detection pipeline failed!');
    console.log(`  [T17] Copied Content Detection pipeline executed unaffected. Report ID: ${ccResult.reportId}\n`);


    console.log('====================================================');
    console.log(' 🎉 ALL TASK 8 STATEMENT EXTRACTION TESTS PASSED!   ');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ TASK 8 TEST FAILURE:', err.message);
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

runTask8Tests().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
