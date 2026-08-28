const assert = require('assert');
const { generatePairs } = require('../algorithms/copiedContent/pairGenerator');
const { analyzeCopiedContentDocuments } = require('../services/copiedContent/copiedContentService');

console.log('====================================================');
console.log('TRUSTLENS C2: MULTIPLE-DOCUMENT COMPARISON TEST SUITE');
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

// --------------------------------------------------------------------------
// TEST 1: Upload 2 documents
// --------------------------------------------------------------------------
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'Networks_A.pdf', extractedText: 'TCP is a connection-oriented transport protocol.' },
    { documentId: 'doc-2', originalName: 'Networks_B.pdf', extractedText: 'TCP is a connection-oriented transport protocol.' },
  ];
  const { pairResults, summary } = analyzeCopiedContentDocuments(docs);
  const pairCount = pairResults.length;

  const passed = pairCount === 1 && summary.totalDocumentPairs === 1;
  recordResult('Test 1: Upload 2 documents', '1 unique comparison pair', `${pairCount} pair generated`, passed);
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 1 (2 Docs): Generated ${pairCount} pair (Expected 1).`);
} catch (err) {
  console.error(`[FAIL] Test 1: ${err.message}`);
  recordResult('Test 1: Upload 2 documents', '1 pair', err.message, false);
}

// --------------------------------------------------------------------------
// TEST 2: Upload 3 documents
// --------------------------------------------------------------------------
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'Doc_A.pdf', extractedText: 'Content for document A testing.' },
    { documentId: 'doc-2', originalName: 'Doc_B.pdf', extractedText: 'Content for document B testing.' },
    { documentId: 'doc-3', originalName: 'Doc_C.pdf', extractedText: 'Content for document C testing.' },
  ];
  const { pairResults, summary } = analyzeCopiedContentDocuments(docs);
  const pairCount = pairResults.length;

  const passed = pairCount === 3 && summary.totalDocumentPairs === 3;
  recordResult('Test 2: Upload 3 documents', '3 unique comparison pairs', `${pairCount} pairs generated`, passed);
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 2 (3 Docs): Generated ${pairCount} pairs (Expected 3).`);
} catch (err) {
  console.error(`[FAIL] Test 2: ${err.message}`);
  recordResult('Test 2: Upload 3 documents', '3 pairs', err.message, false);
}

// --------------------------------------------------------------------------
// TEST 3: Upload 4 documents
// --------------------------------------------------------------------------
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'Doc_A.pdf', extractedText: 'Content for document A testing.' },
    { documentId: 'doc-2', originalName: 'Doc_B.pdf', extractedText: 'Content for document B testing.' },
    { documentId: 'doc-3', originalName: 'Doc_C.pdf', extractedText: 'Content for document C testing.' },
    { documentId: 'doc-4', originalName: 'Doc_D.pdf', extractedText: 'Content for document D testing.' },
  ];
  const { pairResults, summary } = analyzeCopiedContentDocuments(docs);
  const pairCount = pairResults.length;

  const passed = pairCount === 6 && summary.totalDocumentPairs === 6;
  recordResult('Test 3: Upload 4 documents', '6 unique comparison pairs', `${pairCount} pairs generated`, passed);
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 3 (4 Docs): Generated ${pairCount} pairs (Expected 6).`);
} catch (err) {
  console.error(`[FAIL] Test 3: ${err.message}`);
  recordResult('Test 3: Upload 4 documents', '6 pairs', err.message, false);
}

// --------------------------------------------------------------------------
// TEST 4: Verify no document is compared with itself
// --------------------------------------------------------------------------
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'Doc_1.pdf', extractedText: 'Sample text.' },
    { documentId: 'doc-2', originalName: 'Doc_2.pdf', extractedText: 'Sample text.' },
    { documentId: 'doc-3', originalName: 'Doc_3.pdf', extractedText: 'Sample text.' },
    { documentId: 'doc-4', originalName: 'Doc_4.pdf', extractedText: 'Sample text.' },
    { documentId: 'doc-5', originalName: 'Doc_5.pdf', extractedText: 'Sample text.' },
  ];
  const pairs = generatePairs(docs);
  let selfComparisonFound = false;

  for (const pair of pairs) {
    if (pair.docA.documentId === pair.docB.documentId) {
      selfComparisonFound = true;
      break;
    }
  }

  const passed = !selfComparisonFound && pairs.length === 10;
  recordResult('Test 4: No Self-Comparison', 'No self-comparison (docA != docB)', selfComparisonFound ? 'Self-comparison detected' : '0 self-comparisons', passed);
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 4 (No Self-Comparison): Verified docA !== docB across all ${pairs.length} pairs.`);
} catch (err) {
  console.error(`[FAIL] Test 4: ${err.message}`);
  recordResult('Test 4: No Self-Comparison', 'No self-comparison', err.message, false);
}

// --------------------------------------------------------------------------
// TEST 5: Verify reversed duplicate comparisons are not created
// --------------------------------------------------------------------------
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'Doc_1.pdf', extractedText: 'Sample text.' },
    { documentId: 'doc-2', originalName: 'Doc_2.pdf', extractedText: 'Sample text.' },
    { documentId: 'doc-3', originalName: 'Doc_3.pdf', extractedText: 'Sample text.' },
  ];
  const pairs = generatePairs(docs);
  const seenPairKeys = new Set();
  let duplicateFound = false;

  for (const pair of pairs) {
    const key1 = `${pair.docA.documentId}_vs_${pair.docB.documentId}`;
    const key2 = `${pair.docB.documentId}_vs_${pair.docA.documentId}`;

    if (seenPairKeys.has(key1) || seenPairKeys.has(key2)) {
      duplicateFound = true;
      break;
    }
    seenPairKeys.add(key1);
  }

  const passed = !duplicateFound && pairs.length === 3;
  recordResult('Test 5: No Reversed Duplicate Pairs', 'Zero reversed duplicate pairs', duplicateFound ? 'Duplicate pair found' : '0 duplicate pairs', passed);
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 5 (No Duplicate Pairs): Verified 0 reversed duplicate pairs across generated combinations.`);
} catch (err) {
  console.error(`[FAIL] Test 5: ${err.message}`);
  recordResult('Test 5: No Reversed Duplicate Pairs', 'No duplicates', err.message, false);
}

// --------------------------------------------------------------------------
// TEST 6: Highly similar pair + unrelated document
// --------------------------------------------------------------------------
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'TCP_Part1.pdf', extractedText: 'TCP is a connection-oriented transport protocol providing reliable data communication.' },
    { documentId: 'doc-2', originalName: 'TCP_Part2.pdf', extractedText: 'TCP is a connection-oriented transport protocol providing reliable data communication.' },
    { documentId: 'doc-3', originalName: 'PlantBiology.pdf', extractedText: 'Photosynthesis converts light energy into chemical energy in plant cells.' },
  ];
  const { pairResults } = analyzeCopiedContentDocuments(docs);

  // Find pair results
  const similarPair = pairResults.find(p =>
    (p.documentA.documentId === 'doc-1' && p.documentB.documentId === 'doc-2') ||
    (p.documentA.documentId === 'doc-2' && p.documentB.documentId === 'doc-1')
  );
  const unrelatedPair1 = pairResults.find(p =>
    (p.documentA.documentId === 'doc-1' && p.documentB.documentId === 'doc-3') ||
    (p.documentA.documentId === 'doc-3' && p.documentB.documentId === 'doc-1')
  );
  const unrelatedPair2 = pairResults.find(p =>
    (p.documentA.documentId === 'doc-2' && p.documentB.documentId === 'doc-3') ||
    (p.documentA.documentId === 'doc-3' && p.documentB.documentId === 'doc-2')
  );

  const passed =
    similarPair &&
    similarPair.overallMatchedContentPercentage === 100 &&
    unrelatedPair1 &&
    unrelatedPair1.overallMatchedContentPercentage === 0 &&
    unrelatedPair2 &&
    unrelatedPair2.overallMatchedContentPercentage === 0;

  recordResult('Test 6: Similar Pair + Unrelated Doc', 'Only similar pair gets high score (100%), others 0%', `Similar pair: ${similarPair?.overallMatchedContentPercentage}%, Unrelated pairs: ${unrelatedPair1?.overallMatchedContentPercentage}% & ${unrelatedPair2?.overallMatchedContentPercentage}%`, passed);
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 6 (Similar + Unrelated): Similar pair score: ${similarPair?.overallMatchedContentPercentage}%, Unrelated pair scores: 0%.`);
} catch (err) {
  console.error(`[FAIL] Test 6: ${err.message}`);
  recordResult('Test 6: Similar Pair + Unrelated Doc', 'Discriminative pairwise score', err.message, false);
}

// --------------------------------------------------------------------------
// TEST 7: One document fails text extraction
// --------------------------------------------------------------------------
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'Valid_Doc_1.pdf', extractedText: 'TCP is a connection-oriented transport protocol.' },
    { documentId: 'doc-2', originalName: 'Valid_Doc_2.pdf', extractedText: 'TCP is a connection-oriented transport protocol.' },
    { documentId: 'doc-3', originalName: 'Corrupted_Doc_3.pdf', extractedText: '' }, // Failed extraction
  ];
  const { pairResults, summary, failedDocs } = analyzeCopiedContentDocuments(docs);

  const passed =
    failedDocs.length === 1 &&
    failedDocs[0].originalName === 'Corrupted_Doc_3.pdf' &&
    pairResults.length === 1 &&
    summary.totalDocumentPairs === 1;

  recordResult('Test 7: One Doc Fails Extraction', '1 failed doc reported, 2 remaining valid docs compared safely', `Failed docs: ${failedDocs.length}, Valid pair results: ${pairResults.length}`, passed);
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test 7 (Failed Extraction Handling): Reported 1 failed doc ('${failedDocs[0]?.originalName}'), processed 1 pair for remaining valid docs.`);
} catch (err) {
  console.error(`[FAIL] Test 7: ${err.message}`);
  recordResult('Test 7: One Doc Fails Extraction', 'Safe handling', err.message, false);
}

console.log('\n====================================================');
console.log(`RESULTS SUMMARY: ${testsPassed} / 7 TESTS PASSED`);
console.log('====================================================\n');

console.table(results);

if (testsPassed !== 7) {
  process.exit(1);
}
