const assert = require('assert');
const { analyzeStatementsAgainstSources } = require('../services/errorDetection/errorDetectionService');

console.log('====================================================');
console.log('RUNNING PHASE 13A ERROR DETECTION ALGORITHM TESTS');
console.log('====================================================');

let testsPassed = 0;
let testsTotal = 6;

// Sample trusted sources corpus
const mockTrustedSources = [
  {
    id: 'src-1',
    title: 'Cloud Computing Essentials',
    category: 'Computer Science',
    sourceType: 'file',
    extractedText: 'Cloud computing provides on-demand access to computing resources. Cloud computing provides internet-based access to computing services.',
  },
  {
    id: 'src-2',
    title: 'Earth Science Fundamentals',
    category: 'Geology',
    sourceType: 'file',
    extractedText: 'The Earth is approximately 4.54 billion years old. Geological dating confirms this age.',
  },
  {
    id: 'src-3',
    title: 'Physics & Thermodynamics',
    category: 'Physics',
    sourceType: 'file',
    extractedText: 'Water boils at 100 degrees Celsius at standard atmospheric pressure.',
  },
  {
    id: 'src-4',
    title: 'Networking Basics',
    category: 'Computer Science',
    sourceType: 'file',
    extractedText: 'TCP provides reliable communication across computer networks.',
  },
];

// CASE 1: Strongly supported statement
try {
  const statement = 'Cloud computing provides on-demand computing resources.';
  const { resultsList } = analyzeStatementsAgainstSources([statement], mockTrustedSources);
  const result = resultsList[0];

  assert.strictEqual(result.classification, 'verified', `Case 1 Expected 'verified' but got '${result.classification}'`);
  assert(result.similarityScore >= 0.70, `Case 1 Expected similarity >= 0.70, got ${result.similarityScore}`);
  console.log(`[PASS] Case 1 (Strongly Supported): Classified as '${result.classification}' with similarity ${result.similarityScore}`);
  testsPassed++;
} catch (err) {
  console.error(`[FAIL] Case 1: ${err.message}`);
}

// CASE 2: Similar but insufficient evidence
try {
  const statement = 'Cloud computing completely eliminates the need for physical servers.';
  const { resultsList } = analyzeStatementsAgainstSources([statement], mockTrustedSources);
  const result = resultsList[0];

  assert.strictEqual(result.classification, 'insufficient_evidence', `Case 2 Expected 'insufficient_evidence' but got '${result.classification}'`);
  console.log(`[PASS] Case 2 (Similar but Insufficient Evidence): Classified as '${result.classification}' (Similarity: ${result.similarityScore})`);
  testsPassed++;
} catch (err) {
  console.error(`[FAIL] Case 2: ${err.message}`);
}

// CASE 3: Numerical contradiction
try {
  const statement = 'The Earth is 500 million years old.';
  const { resultsList } = analyzeStatementsAgainstSources([statement], mockTrustedSources);
  const result = resultsList[0];

  assert.strictEqual(result.classification, 'potential_contradiction', `Case 3 Expected 'potential_contradiction' but got '${result.classification}'`);
  assert.strictEqual(result.severity, 'high', `Case 3 Expected high severity for numeric mismatch, got '${result.severity}'`);
  console.log(`[PASS] Case 3 (Numerical Contradiction): Classified as '${result.classification}' with severity '${result.severity}'`);
  testsPassed++;
} catch (err) {
  console.error(`[FAIL] Case 3: ${err.message}`);
}

// CASE 4: Negation contradiction
try {
  const statement = 'Water does not boil at 100 degrees Celsius at standard atmospheric pressure.';
  const { resultsList } = analyzeStatementsAgainstSources([statement], mockTrustedSources);
  const result = resultsList[0];

  assert.strictEqual(result.classification, 'potential_contradiction', `Case 4 Expected 'potential_contradiction' but got '${result.classification}'`);
  console.log(`[PASS] Case 4 (Negation Contradiction): Classified as '${result.classification}' (Reason: ${result.reason})`);
  testsPassed++;
} catch (err) {
  console.error(`[FAIL] Case 4: ${err.message}`);
}

// CASE 5: No relevant evidence
try {
  const statement = 'Photosynthesis occurs only at night.';
  const { resultsList } = analyzeStatementsAgainstSources([statement], mockTrustedSources);
  const result = resultsList[0];

  assert(['insufficient_evidence', 'not_analyzed'].includes(result.classification), `Case 5 Expected 'insufficient_evidence' or 'not_analyzed' but got '${result.classification}'`);
  console.log(`[PASS] Case 5 (No Relevant Evidence): Classified as '${result.classification}'`);
  testsPassed++;
} catch (err) {
  console.error(`[FAIL] Case 5: ${err.message}`);
}

// CASE 6: Empty statement
try {
  const statement = '';
  const { resultsList } = analyzeStatementsAgainstSources([statement], mockTrustedSources);
  const result = resultsList[0];

  assert.strictEqual(result.classification, 'not_analyzed', `Case 6 Expected 'not_analyzed' but got '${result.classification}'`);
  console.log(`[PASS] Case 6 (Empty Statement): Classified as '${result.classification}'`);
  testsPassed++;
} catch (err) {
  console.error(`[FAIL] Case 6: ${err.message}`);
}

console.log('====================================================');
console.log(`RESULTS: ${testsPassed} / ${testsTotal} TESTS PASSED.`);
console.log('====================================================');

if (testsPassed !== testsTotal) {
  process.exit(1);
}
