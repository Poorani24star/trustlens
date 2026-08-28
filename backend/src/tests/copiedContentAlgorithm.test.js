const assert = require('assert');
const { analyzeCopiedContentDocuments } = require('../services/copiedContent/copiedContentService');

console.log('====================================================');
console.log('RUNNING PHASE 13B COPIED CONTENT ALGORITHM TESTS');
console.log('====================================================');

let testsPassed = 0;
const testsTotal = 7;

// CASE 1: EXACT COPY
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'DocA.txt', extractedText: 'Cloud computing provides on-demand computing resources over the internet.' },
    { documentId: 'doc-2', originalName: 'DocB.txt', extractedText: 'Cloud computing provides on-demand computing resources over the internet.' },
  ];

  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];

  assert.strictEqual(pair.matches.length, 1, `Case 1 Expected 1 match, got ${pair.matches.length}`);
  assert.strictEqual(pair.matches[0].matchType, 'exact_match', `Case 1 Expected 'exact_match', got '${pair.matches[0].matchType}'`);
  assert(pair.overallMatchedContentPercentage >= 90, `Case 1 Expected matched percentage >= 90%, got ${pair.overallMatchedContentPercentage}%`);
  console.log(`[PASS] Case 1 (Exact Copy): Match type '${pair.matches[0].matchType}', Matched Content: ${pair.overallMatchedContentPercentage}%`);
  testsPassed++;
} catch (err) {
  console.error(`[FAIL] Case 1: ${err.message}`);
}

// CASE 2: NEAR-IDENTICAL CONTENT
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'DocA.txt', extractedText: 'Cloud computing provides on-demand access to computing resources through the internet.' },
    { documentId: 'doc-2', originalName: 'DocB.txt', extractedText: 'Cloud computing provides on-demand access to computer resources via the internet.' },
  ];

  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];

  assert(pair.matches.length >= 1, `Case 2 Expected at least 1 match, got ${pair.matches.length}`);
  assert(['near_identical', 'exact_match', 'near-match'].includes(pair.matches[0].matchType), `Case 2 Expected 'near_identical', got '${pair.matches[0].matchType}'`);
  console.log(`[PASS] Case 2 (Near-Identical): Match type '${pair.matches[0].matchType}', Similarity: ${pair.matches[0].similarity}%`);
  testsPassed++;
} catch (err) {
  console.error(`[FAIL] Case 2: ${err.message}`);
}

// CASE 3: PARTIAL MATCH
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'DocA.txt', extractedText: 'Cloud computing provides scalable resources, storage, and computing services through the internet.' },
    { documentId: 'doc-2', originalName: 'DocB.txt', extractedText: 'Cloud computing provides scalable computing services through the internet.' },
  ];

  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];

  assert(pair.matches.length >= 1, `Case 3 Expected at least 1 match, got ${pair.matches.length}`);
  assert(['partial_match', 'near_identical'].includes(pair.matches[0].matchType), `Case 3 Expected partial or near match, got '${pair.matches[0].matchType}'`);
  console.log(`[PASS] Case 3 (Partial Match): Match type '${pair.matches[0].matchType}', Similarity: ${pair.matches[0].similarity}%`);
  testsPassed++;
} catch (err) {
  console.error(`[FAIL] Case 3: ${err.message}`);
}

// CASE 4: UNRELATED DOCUMENTS
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'DocA.txt', extractedText: 'Cloud computing provides virtual computing resources across datacenters.' },
    { documentId: 'doc-2', originalName: 'DocB.txt', extractedText: 'Photosynthesis converts light energy into chemical energy in plant cells.' },
  ];

  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];

  assert.strictEqual(pair.matches.length, 0, `Case 4 Expected 0 matches, got ${pair.matches.length}`);
  assert.strictEqual(pair.overallMatchedContentPercentage, 0, `Case 4 Expected 0% matched content, got ${pair.overallMatchedContentPercentage}%`);
  console.log(`[PASS] Case 4 (Unrelated Documents): 0 matches, 0% Matched Content Percentage.`);
  testsPassed++;
} catch (err) {
  console.error(`[FAIL] Case 4: ${err.message}`);
}

// CASE 5: MULTIPLE DOCUMENTS (4 documents -> 6 pairs)
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'DocA.txt', extractedText: 'First document text for testing pairwise document comparison.' },
    { documentId: 'doc-2', originalName: 'DocB.txt', extractedText: 'Second document text for testing pairwise document comparison.' },
    { documentId: 'doc-3', originalName: 'DocC.txt', extractedText: 'Third document text for testing pairwise document comparison.' },
    { documentId: 'doc-4', originalName: 'DocD.txt', extractedText: 'Fourth document text for testing pairwise document comparison.' },
  ];

  const { pairResults, summary } = analyzeCopiedContentDocuments(docs);
  const expectedPairs = 4 * (4 - 1) / 2; // 6

  assert.strictEqual(pairResults.length, expectedPairs, `Case 5 Expected ${expectedPairs} pairs, got ${pairResults.length}`);
  assert.strictEqual(summary.totalDocumentPairs, 6, `Case 5 Summary expected 6 pairs, got ${summary.totalDocumentPairs}`);
  console.log(`[PASS] Case 5 (Multiple Documents): Successfully generated and compared exactly ${pairResults.length} unique document pairs.`);
  testsPassed++;
} catch (err) {
  console.error(`[FAIL] Case 5: ${err.message}`);
}

// CASE 6: SHORT PASSAGES (< 5 words shingle size)
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'DocA.txt', extractedText: 'Short text claim.' },
    { documentId: 'doc-2', originalName: 'DocB.txt', extractedText: 'Short text claim.' },
  ];

  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];

  assert(pair.matches.length >= 1, `Case 6 Expected match for short identical text, got ${pair.matches.length}`);
  console.log(`[PASS] Case 6 (Short Passages): Handled without errors, match type '${pair.matches[0].matchType}'.`);
  testsPassed++;
} catch (err) {
  console.error(`[FAIL] Case 6: ${err.message}`);
}

// CASE 7: EMPTY DOCUMENT
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'DocA.txt', extractedText: 'Valid document text for testing empty document safety.' },
    { documentId: 'doc-2', originalName: 'DocB.txt', extractedText: '   ' },
  ];

  let threwError = false;
  try {
    analyzeCopiedContentDocuments(docs);
  } catch (err) {
    threwError = true;
    assert.strictEqual(err.statusCode, 400, `Case 7 Expected status code 400, got ${err.statusCode}`);
  }

  assert(threwError, 'Case 7 Expected validation error when < 2 valid documents remain');
  console.log(`[PASS] Case 7 (Empty Document Handling): Safely rejected comparison when fewer than 2 non-empty documents exist.`);
  testsPassed++;
} catch (err) {
  console.error(`[FAIL] Case 7: ${err.message}`);
}

console.log('====================================================');
console.log(`RESULTS: ${testsPassed} / ${testsTotal} TESTS PASSED.`);
console.log('====================================================');

// STEP 24: PERFORMANCE VALIDATION (2, 5, 10 Documents)
console.log('\n====================================================');
console.log('STEP 24: PERFORMANCE OBSERVATION BENCHMARK');
console.log('====================================================');

function runBenchmark(docCount) {
  const docs = [];
  for (let i = 1; i <= docCount; i++) {
    docs.push({
      documentId: `benchmark-doc-${i}`,
      originalName: `Document_${i}.txt`,
      extractedText: `This is paragraph number ${i} for performance benchmark testing of pairwise document comparison. It discusses cloud computing, distributed systems, and scalability.`,
    });
  }

  const startTime = Date.now();
  const { pairResults, summary } = analyzeCopiedContentDocuments(docs);
  const durationMs = Date.now() - startTime;

  let totalCandidatePairs = 0;
  let totalComparisons = 0;
  for (const pair of pairResults) {
    if (pair.comparison) {
      totalComparisons += pair.comparison.passagesCompared;
      totalCandidatePairs += pair.comparison.candidatePairs;
    }
  }

  console.log(`[BENCHMARK] ${docCount} Documents:`);
  console.log(`  - Unique Document Pairs: ${summary.totalDocumentPairs} (${docCount} * ${docCount - 1} / 2)`);
  console.log(`  - Total Passage Comparisons: ${totalComparisons}`);
  console.log(`  - Levenshtein Candidate Comparisons: ${totalCandidatePairs}`);
  console.log(`  - Candidate Filtering Skip Rate: ${totalComparisons > 0 ? (((totalComparisons - totalCandidatePairs) / totalComparisons) * 100).toFixed(1) : 0}%`);
  console.log(`  - Execution Time: ${durationMs} ms\n`);
}

runBenchmark(2);
runBenchmark(5);
runBenchmark(10);

if (testsPassed !== testsTotal) {
  process.exit(1);
}
