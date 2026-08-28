const assert = require('assert');
const { analyzeStatementsAgainstSources } = require('../../services/errorDetection/errorDetectionService');
const { analyzeCopiedContentDocuments } = require('../../services/copiedContent/copiedContentService');
const { normalizeText } = require('../../algorithms/copiedContent/textNormalizer');

console.log('====================================================');
console.log('RUNNING PHASE 13C: DETERMINISM & EDGE CASES TESTING');
console.log('====================================================');

let passedTests = 0;
let totalTests = 0;

// Corpus for Error Detection
const mockSources = [
  {
    id: 'src-1',
    title: 'Cloud Fundamentals',
    category: 'Computer Science',
    sourceType: 'file',
    extractedText: 'Cloud computing provides on-demand access to computing resources. The Earth is approximately 4.54 billion years old.',
  },
];

// PART 8: DETERMINISM TESTING (Multi-pass 3-run verification)
console.log('\n--- Part 8: Determinism Verification (3 Runs per Case) ---');

function testDeterminismED(statement, expectedClassification) {
  totalTests++;
  const run1 = analyzeStatementsAgainstSources([statement], mockSources).resultsList[0];
  const run2 = analyzeStatementsAgainstSources([statement], mockSources).resultsList[0];
  const run3 = analyzeStatementsAgainstSources([statement], mockSources).resultsList[0];

  assert.strictEqual(run1.classification, expectedClassification);
  assert.strictEqual(run2.classification, expectedClassification);
  assert.strictEqual(run3.classification, expectedClassification);

  assert.strictEqual(run1.similarityScore, run2.similarityScore);
  assert.strictEqual(run2.similarityScore, run3.similarityScore);

  console.log(`[PASS] Determinism ED ('${statement.substring(0, 30)}...'): 3/3 identical outputs (${run1.classification}, score: ${run1.similarityScore})`);
  passedTests++;
}

testDeterminismED('Cloud computing provides on-demand access to computing resources.', 'verified');
testDeterminismED('The Earth is 500 million years old.', 'potential_contradiction');

function testDeterminismCC(textA, textB, expectedMatch) {
  totalTests++;
  const docs = [
    { documentId: 'doc-1', originalName: 'A.txt', extractedText: textA },
    { documentId: 'doc-2', originalName: 'B.txt', extractedText: textB },
  ];

  const res1 = analyzeCopiedContentDocuments(docs).pairResults[0];
  const res2 = analyzeCopiedContentDocuments(docs).pairResults[0];
  const res3 = analyzeCopiedContentDocuments(docs).pairResults[0];

  assert.strictEqual(res1.overallMatchedContentPercentage, res2.overallMatchedContentPercentage);
  assert.strictEqual(res2.overallMatchedContentPercentage, res3.overallMatchedContentPercentage);

  const match1 = res1.matches[0] ? res1.matches[0].matchType : 'no_match';
  const match2 = res2.matches[0] ? res2.matches[0].matchType : 'no_match';
  const match3 = res3.matches[0] ? res3.matches[0].matchType : 'no_match';

  assert.strictEqual(match1, expectedMatch);
  assert.strictEqual(match2, expectedMatch);
  assert.strictEqual(match3, expectedMatch);

  console.log(`[PASS] Determinism CC ('${textA.substring(0, 30)}...'): 3/3 identical outputs (${match1}, matched: ${res1.overallMatchedContentPercentage}%)`);
  passedTests++;
}

testDeterminismCC(
  'Cloud computing provides on-demand computing resources over the internet.',
  'Cloud computing provides on-demand computing resources over the internet.',
  'exact_match'
);

testDeterminismCC(
  'Cloud computing provides on-demand access to computing resources through the internet.',
  'Cloud computing provides on-demand access to computer resources via the internet.',
  'near_identical'
);


// PART 9 & 10: EDGE CASE & NORMALIZATION TESTING
console.log('\n--- Part 9 & 10: Edge Cases & Normalization Validation ---');

// Case 1: Normalization consistency across capitalization, punctuation, whitespace
totalTests++;
const norm1 = normalizeText('CLOUD COMPUTING!!!');
const norm2 = normalizeText('cloud computing');
const norm3 = normalizeText('Cloud    Computing');
assert.strictEqual(norm1, 'cloud computing');
assert.strictEqual(norm2, 'cloud computing');
assert.strictEqual(norm3, 'cloud computing');
console.log('[PASS] Text Normalization Consistency: Lowercasing, punctuation stripping, and whitespace collapse verified.');
passedTests++;

// Case 2: Special Characters & Repeated Sentences in Copied Content
totalTests++;
const specA = 'Cloud Computing (v2.0) -- provides @100% on-demand resources!!!';
const specB = 'cloud computing v2 0 provides 100 on demand resources';
const ccResult = analyzeCopiedContentDocuments([
  { documentId: 'doc-1', originalName: 'SpecA.txt', extractedText: specA },
  { documentId: 'doc-2', originalName: 'SpecB.txt', extractedText: specB },
]);
assert(ccResult.pairResults[0].matches.length >= 1);
console.log(`[PASS] Edge Case (Special Characters & Capitalization): Classified as '${ccResult.pairResults[0].matches[0].matchType}'.`);
passedTests++;

// Case 3: Threshold Boundary Handling (Score = 0.80, Score = 0.60)
totalTests++;
const { classifyMatch } = require('../../algorithms/copiedContent/matchClassifier');
const exactClass = classifyMatch({ normalizedText: 'a' }, { normalizedText: 'b' }, 'hash1', 'hash1', 1.0, 1.0);
const highClass = classifyMatch({ normalizedText: 'a' }, { normalizedText: 'b' }, 'h1', 'h2', 0.80, 0.80);
const medClass = classifyMatch({ normalizedText: 'a' }, { normalizedText: 'b' }, 'h1', 'h2', 0.60, 0.60);
const lowClass = classifyMatch({ normalizedText: 'a' }, { normalizedText: 'b' }, 'h1', 'h2', 0.20, 0.20);

assert.strictEqual(exactClass.matchType, 'exact_match');
assert.strictEqual(highClass.matchType, 'near_identical');
assert.strictEqual(medClass.matchType, 'partial_match');
assert.strictEqual(lowClass.matchType, 'no_match');
console.log('[PASS] Threshold Boundary Handling: Threshold boundaries (1.0, 0.80, 0.60, <0.60) function strictly as configured.');
passedTests++;

console.log('\n====================================================');
console.log(`DETERMINISM & EDGE CASES SUMMARY: ${passedTests} / ${totalTests} PASSED`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
