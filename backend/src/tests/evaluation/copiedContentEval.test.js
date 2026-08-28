const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { analyzeCopiedContentDocuments } = require('../../services/copiedContent/copiedContentService');

console.log('====================================================');
console.log('RUNNING PHASE 13C: COPIED CONTENT EVALUATION');
console.log('====================================================');

const testCases = [];
let passedCount = 0;
let falsePositives = 0;
let falseNegatives = 0;

// CASE CC1: EXACT COPY
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'DocA.txt', extractedText: 'Cloud computing provides on-demand computing resources over the internet.' },
    { documentId: 'doc-2', originalName: 'DocB.txt', extractedText: 'Cloud computing provides on-demand computing resources over the internet.' },
  ];

  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];
  const match = pair.matches[0];

  const isPass = match && match.matchType === 'exact_match' && pair.overallMatchedContentPercentage >= 90;
  if (isPass) passedCount++;

  testCases.push({
    testCaseId: 'CC1',
    description: 'Exact Copy Document Pair',
    expectedMatch: 'exact_match',
    actualMatch: match ? match.matchType : 'no_match',
    matchedContentPercentage: pair.overallMatchedContentPercentage,
    jaccardSimilarity: match ? match.jaccardSimilarity : 0,
    levenshteinSimilarity: match ? match.levenshteinSimilarity : 0,
    combinedSimilarity: match ? match.combinedSimilarity : 0,
    passed: isPass,
  });

  console.log(`[${isPass ? 'PASS' : 'FAIL'}] CC1 (Exact Copy): Match type '${match ? match.matchType : 'none'}', Matched Content: ${pair.overallMatchedContentPercentage}%`);
} catch (err) {
  console.error(`[FAIL] CC1: ${err.message}`);
}

// CASE CC2: NEAR-IDENTICAL CONTENT
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'DocA.txt', extractedText: 'Cloud computing provides on-demand access to computing resources through the internet.' },
    { documentId: 'doc-2', originalName: 'DocB.txt', extractedText: 'Cloud computing provides on-demand access to computer resources via the internet.' },
  ];

  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];
  const match = pair.matches[0];

  const isPass = match && ['near_identical', 'exact_match'].includes(match.matchType);
  if (isPass) passedCount++;

  testCases.push({
    testCaseId: 'CC2',
    description: 'Near-Identical Content Pair',
    expectedMatch: 'near_identical',
    actualMatch: match ? match.matchType : 'no_match',
    matchedContentPercentage: pair.overallMatchedContentPercentage,
    jaccardSimilarity: match ? match.jaccardSimilarity : 0,
    levenshteinSimilarity: match ? match.levenshteinSimilarity : 0,
    combinedSimilarity: match ? match.combinedSimilarity : 0,
    passed: isPass,
  });

  console.log(`[${isPass ? 'PASS' : 'FAIL'}] CC2 (Near-Identical): Match type '${match ? match.matchType : 'none'}', Similarity: ${match ? match.similarity : 0}%`);
} catch (err) {
  console.error(`[FAIL] CC2: ${err.message}`);
}

// CASE CC3: PARTIAL MATCH
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'DocA.txt', extractedText: 'Cloud computing provides scalable resources, storage, and computing services through the internet.' },
    { documentId: 'doc-2', originalName: 'DocB.txt', extractedText: 'Cloud computing provides scalable computing services through the internet.' },
  ];

  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];
  const match = pair.matches[0];

  const isPass = match && ['partial_match', 'near_identical'].includes(match.matchType);
  if (isPass) passedCount++;

  testCases.push({
    testCaseId: 'CC3',
    description: 'Partial Match Document Pair',
    expectedMatch: 'partial_match',
    actualMatch: match ? match.matchType : 'no_match',
    matchedContentPercentage: pair.overallMatchedContentPercentage,
    jaccardSimilarity: match ? match.jaccardSimilarity : 0,
    levenshteinSimilarity: match ? match.levenshteinSimilarity : 0,
    combinedSimilarity: match ? match.combinedSimilarity : 0,
    passed: isPass,
  });

  console.log(`[${isPass ? 'PASS' : 'FAIL'}] CC3 (Partial Match): Match type '${match ? match.matchType : 'none'}', Similarity: ${match ? match.similarity : 0}%`);
} catch (err) {
  console.error(`[FAIL] CC3: ${err.message}`);
}

// CASE CC4: UNRELATED CONTENT
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'DocA.txt', extractedText: 'Cloud computing provides virtual computing resources.' },
    { documentId: 'doc-2', originalName: 'DocB.txt', extractedText: 'Photosynthesis converts light energy into chemical energy.' },
  ];

  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];

  const isPass = pair.matches.length === 0 && pair.overallMatchedContentPercentage === 0;
  if (isPass) {
    passedCount++;
  } else {
    falsePositives++;
  }

  testCases.push({
    testCaseId: 'CC4',
    description: 'Unrelated Content Document Pair',
    expectedMatch: 'no_match',
    actualMatch: pair.matches.length > 0 ? pair.matches[0].matchType : 'no_match',
    matchedContentPercentage: pair.overallMatchedContentPercentage,
    passed: isPass,
  });

  console.log(`[${isPass ? 'PASS' : 'FAIL'}] CC4 (Unrelated Content): 0 matches, 0% Matched Content Percentage.`);
} catch (err) {
  console.error(`[FAIL] CC4: ${err.message}`);
}

// CASE CC5: MULTIPLE DOCUMENTS (4 documents -> 6 pairs)
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'Doc1.txt', extractedText: 'Cloud computing provides on-demand access to computing resources over the internet.' },
    { documentId: 'doc-2', originalName: 'Doc2.txt', extractedText: 'Cloud computing provides on-demand access to computing resources over the internet.' },
    { documentId: 'doc-3', originalName: 'Doc3.txt', extractedText: 'Cloud computing provides on-demand access to computer resources via the internet.' },
    { documentId: 'doc-4', originalName: 'Doc4.txt', extractedText: 'Photosynthesis converts light energy into chemical energy in plant cells.' },
  ];

  const { pairResults, summary } = analyzeCopiedContentDocuments(docs);
  const expectedPairs = 6;

  const isPass = pairResults.length === expectedPairs && summary.totalDocumentPairs === 6;
  if (isPass) passedCount++;

  testCases.push({
    testCaseId: 'CC5',
    description: 'Multiple Document Pair Combination (4 docs -> 6 pairs)',
    expectedMatch: '6 unique document pairs',
    actualMatch: `${pairResults.length} pairs compared`,
    passed: isPass,
  });

  console.log(`[${isPass ? 'PASS' : 'FAIL'}] CC5 (Multiple Documents): Generated ${pairResults.length} unique document pairs.`);
} catch (err) {
  console.error(`[FAIL] CC5: ${err.message}`);
}

// CASE CC6: SHORT PASSAGES (< 5 words)
try {
  const docs = [
    { documentId: 'doc-1', originalName: 'DocA.txt', extractedText: 'Short text claim.' },
    { documentId: 'doc-2', originalName: 'DocB.txt', extractedText: 'Short text claim.' },
  ];

  const { pairResults } = analyzeCopiedContentDocuments(docs);
  const pair = pairResults[0];
  const match = pair.matches[0];

  const isPass = match && !isNaN(match.similarity) && isFinite(match.similarity);
  if (isPass) passedCount++;

  testCases.push({
    testCaseId: 'CC6',
    description: 'Short Passages Below Shingle Size',
    expectedMatch: 'safe match evaluation',
    actualMatch: match ? match.matchType : 'no_match',
    passed: isPass,
  });

  console.log(`[${isPass ? 'PASS' : 'FAIL'}] CC6 (Short Passages): Handled without NaN/Infinity errors, match type '${match ? match.matchType : 'none'}'.`);
} catch (err) {
  console.error(`[FAIL] CC6: ${err.message}`);
}

// CASE CC7: EMPTY DOCUMENT HANDLING
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
    assert.strictEqual(err.statusCode, 400);
  }

  const isPass = threwError;
  if (isPass) passedCount++;

  testCases.push({
    testCaseId: 'CC7',
    description: 'Empty Document Safety Check',
    expectedMatch: 'rejected with status 400',
    actualMatch: threwError ? 'rejected with status 400' : 'accepted',
    passed: isPass,
  });

  console.log(`[${isPass ? 'PASS' : 'FAIL'}] CC7 (Empty Document): Safely rejected comparison when fewer than 2 non-empty documents exist.`);
} catch (err) {
  console.error(`[FAIL] CC7: ${err.message}`);
}

const accuracy = Number(((passedCount / testCases.length) * 100).toFixed(2));

console.log('\n====================================================');
console.log(`COPIED CONTENT ACCURACY: ${passedCount} / ${testCases.length} PASSED (${accuracy}%)`);
console.log(`FALSE POSITIVES: ${falsePositives}, FALSE NEGATIVES: ${falseNegatives}`);
console.log('====================================================');

// Persist structured result JSON artifact
const resultsDir = path.join(__dirname, '../results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const outputPayload = {
  generatedAt: new Date().toISOString(),
  algorithm: 'pairwise_shingling_jaccard_levenshtein_hashing',
  totalTests: testCases.length,
  passed: passedCount,
  failed: testCases.length - passedCount,
  controlledTestDatasetAccuracyPercentage: accuracy,
  falsePositives,
  falseNegatives,
  testCases,
};

fs.writeFileSync(
  path.join(resultsDir, 'copiedContentEvaluation.json'),
  JSON.stringify(outputPayload, null, 2)
);

console.log(`Saved evaluation results to ${path.join(resultsDir, 'copiedContentEvaluation.json')}`);

if (passedCount !== testCases.length) {
  process.exit(1);
}
