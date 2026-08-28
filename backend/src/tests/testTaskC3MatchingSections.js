const assert = require('assert');
const { analyzeCopiedContentDocuments } = require('../services/copiedContent/copiedContentService');
const { compareAndAggregateDocumentPair } = require('../algorithms/copiedContent/resultAggregator');

console.log('====================================================');
console.log('TRUSTLENS C3: SIMILARITY RESULTS & MATCHING SECTIONS TEST SUITE');
console.log('====================================================\n');

let testsPassed = 0;
const results = [];

function recordResult(testName, expected, actualResult, passed) {
  results.push({
    testName,
    expected,
    actualResult,
    status: passed ? 'PASS' : 'FAIL',
  });
  if (passed) testsPassed++;
}

// Helper to derive canonical status label from score
function getCanonicalStatus(score) {
  if (score >= 80) return 'High Similarity Detected';
  if (score >= 60) return 'Potential Copied Content';
  return 'No Significant Similarity';
}

// --------------------------------------------------------------------------
// TEST 1: Identical documents
// --------------------------------------------------------------------------
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'Original.pdf', extractedText: 'TCP is a connection-oriented transport protocol that provides reliable data communication.' },
    { documentId: 'doc-2', originalName: 'Copy.pdf', extractedText: 'TCP is a connection-oriented transport protocol that provides reliable data communication.' },
  ];
  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];
  const status = getCanonicalStatus(pair.overallMatchedContentPercentage);

  const passed =
    pair.overallMatchedContentPercentage === 100 &&
    status === 'High Similarity Detected' &&
    pair.matches.length >= 1 &&
    pair.matches[0].matchType === 'exact_match';

  recordResult('Test 1: Identical Documents', '100% similarity, "High Similarity Detected", exact match section', `Score: ${pair.overallMatchedContentPercentage}%, Status: "${status}", ${pair.matches.length} match(es)`, passed);
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 1 (Identical): Score: ${pair.overallMatchedContentPercentage}%, Status: "${status}", Matches: ${pair.matches.length}`);
} catch (err) {
  console.error(`[FAIL] Test 1: ${err.message}`);
  recordResult('Test 1: Identical Documents', 'High similarity & exact match', err.message, false);
}

// --------------------------------------------------------------------------
// TEST 2: Partially copied paragraph
// --------------------------------------------------------------------------
try {
  const docs = [
    {
      documentId: 'doc-1',
      originalName: 'Essay_A.pdf',
      extractedText: 'Operating systems manage hardware resources.\n\nTCP is a connection-oriented protocol ensuring reliable delivery.\n\nDatabases store structured data.',
    },
    {
      documentId: 'doc-2',
      originalName: 'Essay_B.pdf',
      extractedText: 'Cloud computing offers on-demand virtual servers.\n\nTCP is a connection-oriented protocol ensuring reliable delivery.\n\nSoftware engineering involves life cycle phases.',
    },
  ];
  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];

  const copiedMatch = pair.matches.find(m => m.documentAPassage.includes('TCP is a connection-oriented protocol'));
  const passed =
    copiedMatch &&
    copiedMatch.documentAPassage === copiedMatch.documentBPassage &&
    copiedMatch.matchType === 'exact_match' &&
    pair.matches.length === 1;

  recordResult('Test 2: Partially Copied Paragraph', 'Copied section appears with exact text snippets', copiedMatch ? `Found copied section snippet: "${copiedMatch.documentAPassage.substring(0, 30)}..."` : 'Not found', passed);
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 2 (Partially Copied): Copied passage identified cleanly: "${copiedMatch?.documentAPassage.substring(0, 35)}..."`);
} catch (err) {
  console.error(`[FAIL] Test 2: ${err.message}`);
  recordResult('Test 2: Partially Copied Paragraph', 'Copied section match', err.message, false);
}

// --------------------------------------------------------------------------
// TEST 3: Different documents
// --------------------------------------------------------------------------
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'DataStructures.pdf', extractedText: 'A binary search tree maintains sorted nodes for fast lookup.' },
    { documentId: 'doc-2', originalName: 'MachineLearning.pdf', extractedText: 'Supervised learning trains models using labeled dataset pairs.' },
  ];
  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];
  const status = getCanonicalStatus(pair.overallMatchedContentPercentage);

  const passed =
    pair.overallMatchedContentPercentage === 0 &&
    status === 'No Significant Similarity' &&
    pair.matches.length === 0;

  recordResult('Test 3: Different Documents', '0% similarity, "No Significant Similarity", 0 matching sections', `Score: ${pair.overallMatchedContentPercentage}%, Status: "${status}", Matches: ${pair.matches.length}`, passed);
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 3 (Different Documents): Score: ${pair.overallMatchedContentPercentage}%, Status: "${status}", Matches: ${pair.matches.length}`);
} catch (err) {
  console.error(`[FAIL] Test 3: ${err.message}`);
  recordResult('Test 3: Different Documents', 'Zero matches', err.message, false);
}

// --------------------------------------------------------------------------
// TEST 4: Common short phrases
// --------------------------------------------------------------------------
try {
  const docs = [
    {
      documentId: 'doc-1',
      originalName: 'App_A.pdf',
      extractedText: 'Software development requires careful architecture planning.\n\nThe system uses a database to store information.\n\nDevelopers write unit tests for code quality.',
    },
    {
      documentId: 'doc-2',
      originalName: 'App_B.pdf',
      extractedText: 'Cloud infrastructure provides scalable computing resources.\n\nThe application uses a database to store information.\n\nMicroservices communicate via lightweight HTTP APIs.',
    },
  ];
  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];
  const status = getCanonicalStatus(pair.overallMatchedContentPercentage);

  // Short common sentence in distinct documents results in low overall similarity (< 60%), avoiding plagiarism false positive
  const passed = pair.overallMatchedContentPercentage < 60 && status === 'No Significant Similarity';
  recordResult('Test 4: Common Short Phrases', 'Filters false positive plagiarism warning for short common phrase', `Overall similarity: ${pair.overallMatchedContentPercentage}%, Status: "${status}"`, passed);
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 4 (Common Short Phrases): Noise filtered cleanly, overall similarity: ${pair.overallMatchedContentPercentage}% ("${status}").`);
} catch (err) {
  console.error(`[FAIL] Test 4: ${err.message}`);
  recordResult('Test 4: Common Short Phrases', 'Noise filter', err.message, false);
}

// --------------------------------------------------------------------------
// TEST 5: Multiple document pairs
// --------------------------------------------------------------------------
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'Doc_A.pdf', extractedText: 'TCP is connection-oriented and reliable.' },
    { documentId: 'doc-2', originalName: 'Doc_B.pdf', extractedText: 'TCP is connection-oriented and reliable.' },
    { documentId: 'doc-3', originalName: 'Doc_C.pdf', extractedText: 'Operating systems manage hardware memory.' },
  ];
  const { pairResults } = analyzeCopiedContentDocuments(docs);

  const pair12 = pairResults.find(p => p.documentA.documentId === 'doc-1' && p.documentB.documentId === 'doc-2');
  const pair13 = pairResults.find(p => p.documentA.documentId === 'doc-1' && p.documentB.documentId === 'doc-3');

  const passed =
    pair12 &&
    pair12.matches.length === 1 &&
    pair12.matches[0].documentA.documentId === 'doc-1' &&
    pair13 &&
    pair13.matches.length === 0;

  recordResult('Test 5: Multiple Document Pairs', 'Section matches remain strictly associated with correct document pair', `Pair 1-2 matches: ${pair12?.matches.length}, Pair 1-3 matches: ${pair13?.matches.length}`, passed);
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 5 (Multiple Document Pairs): Pair 1-2 matches: ${pair12?.matches.length}, Pair 1-3 matches: ${pair13?.matches.length}.`);
} catch (err) {
  console.error(`[FAIL] Test 5: ${err.message}`);
  recordResult('Test 5: Multiple Document Pairs', 'Pair isolation', err.message, false);
}

// --------------------------------------------------------------------------
// TEST 6: Long paragraphs
// --------------------------------------------------------------------------
try {
  const longParagraphA = 'Computer networks enable devices to share resources and communicate. '.repeat(15);
  const longParagraphB = 'Computer networks enable devices to share resources and communicate. '.repeat(15);

  const docs = [
    { documentId: 'doc-1', originalName: 'Long_Doc_A.pdf', extractedText: longParagraphA },
    { documentId: 'doc-2', originalName: 'Long_Doc_B.pdf', extractedText: longParagraphB },
  ];
  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];

  const passed = pair.overallMatchedContentPercentage === 100 && pair.matches.length >= 1;
  recordResult('Test 6: Long Paragraphs', 'Long text paragraphs extracted and compared cleanly without error', `Passage length: ${pair.matches[0]?.documentAPassage.length} chars, Matches: ${pair.matches.length}`, passed);
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 6 (Long Paragraphs): Successfully processed ${pair.matches[0]?.documentAPassage.length} char long passage.`);
} catch (err) {
  console.error(`[FAIL] Test 6: ${err.message}`);
  recordResult('Test 6: Long Paragraphs', 'Long paragraph handling', err.message, false);
}

// --------------------------------------------------------------------------
// TEST 7: Refresh/recalculation behavior
// --------------------------------------------------------------------------
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'File1.pdf', extractedText: 'TCP provides reliable connection-oriented communication across packet networks.' },
    { documentId: 'doc-2', originalName: 'File2.pdf', extractedText: 'TCP provides reliable connection-oriented communication across packet networks.' },
  ];

  const run1 = analyzeCopiedContentDocuments(docs);
  const run2 = analyzeCopiedContentDocuments(docs);

  const score1 = run1.pairResults[0].overallMatchedContentPercentage;
  const score2 = run2.pairResults[0].overallMatchedContentPercentage;
  const matches1 = run1.pairResults[0].matches.length;
  const matches2 = run2.pairResults[0].matches.length;

  const passed = score1 === score2 && matches1 === matches2 && score1 === 100;
  recordResult('Test 7: Consistent Recalculation', 'Repeated execution produces identical deterministic scores and matches', `Run 1: ${score1}% (${matches1} match), Run 2: ${score2}% (${matches2} match)`, passed);
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 7 (Consistent Recalculation): Verified 100% deterministic output across analysis runs.`);
} catch (err) {
  console.error(`[FAIL] Test 7: ${err.message}`);
  recordResult('Test 7: Consistent Recalculation', 'Deterministic output', err.message, false);
}

console.log('\n====================================================');
console.log(`RESULTS SUMMARY: ${testsPassed} / 7 TESTS PASSED`);
console.log('====================================================\n');

console.table(results);

if (testsPassed !== 7) {
  process.exit(1);
}
