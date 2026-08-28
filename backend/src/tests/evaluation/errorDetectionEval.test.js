const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { analyzeStatementsAgainstSources } = require('../../services/errorDetection/errorDetectionService');

console.log('====================================================');
console.log('RUNNING PHASE 13C: ERROR DETECTION EVALUATION');
console.log('====================================================');

// Trusted Evidence Knowledge Corpus
const mockTrustedSources = [
  {
    id: 'src-ed-1',
    title: 'Cloud Computing Essentials',
    category: 'Computer Science',
    sourceType: 'file',
    extractedText: 'Cloud computing provides on-demand access to shared computing resources over the internet.',
  },
  {
    id: 'src-ed-2',
    title: 'Networking Fundamentals',
    category: 'Computer Science',
    sourceType: 'file',
    extractedText: 'TCP provides reliable, ordered, and error-checked delivery of data across computer networks. TCP provides reliable communication.',
  },
  {
    id: 'src-ed-3',
    title: 'Earth Science Fundamentals',
    category: 'Geology',
    sourceType: 'file',
    extractedText: 'The Earth is approximately 4.54 billion years old. Geological radiometric dating confirms this age.',
  },
  {
    id: 'src-ed-4',
    title: 'Thermodynamics & Chemistry',
    category: 'Physics',
    sourceType: 'file',
    extractedText: 'Water boils at 100 degrees Celsius at standard atmospheric pressure.',
  },
  {
    id: 'src-ed-5',
    title: 'Plant Biology Basics',
    category: 'Biology',
    sourceType: 'file',
    extractedText: 'Photosynthesis converts light energy into chemical energy in green plants.',
  },
];

// Controlled Test Dataset Cases (ED1 - ED9)
const testCases = [
  {
    id: 'ED1',
    description: 'Cloud Computing On-Demand Access',
    statement: 'Cloud computing provides on-demand access to computing resources.',
    expectedClassification: 'verified',
  },
  {
    id: 'ED2',
    description: 'TCP Reliable Data Delivery',
    statement: 'TCP provides reliable data delivery.',
    expectedClassification: 'verified',
  },
  {
    id: 'ED3',
    description: 'Earth Age Numerical Discrepancy',
    statement: 'The Earth is 500 million years old.',
    expectedClassification: 'potential_contradiction',
    expectedContradictionType: 'numeric-mismatch',
  },
  {
    id: 'ED4',
    description: 'Water Boiling Negation Discrepancy',
    statement: 'Water does not boil at 100 degrees Celsius at standard atmospheric pressure.',
    expectedClassification: 'potential_contradiction',
    expectedContradictionType: 'negation-contrast',
  },
  {
    id: 'ED5',
    description: 'Photosynthesis Electricity Claim',
    statement: 'Photosynthesis is the process by which plants create electricity.',
    expectedClassification: 'insufficient_evidence',
  },
  {
    id: 'ED6',
    description: 'Ancient Rome on Mars Claim',
    statement: 'Ancient Rome was founded on Mars.',
    expectedClassification: 'insufficient_evidence',
  },
  {
    id: 'ED7',
    description: 'Empty Statement Handling',
    statement: '',
    expectedClassification: 'not_analyzed',
  },
  {
    id: 'ED8',
    description: 'Very Short Statement Below Threshold',
    statement: 'Hello',
    expectedClassification: 'not_analyzed',
  },
  {
    id: 'ED9',
    description: 'No Candidate Evidence in Corpus',
    statement: 'Quantum computing utilizes qubits for superposition and entanglement.',
    expectedClassification: 'insufficient_evidence',
  },
];

const results = [];
const confusionMatrix = {};
let passedCount = 0;

for (const tc of testCases) {
  const { resultsList } = analyzeStatementsAgainstSources([tc.statement], mockTrustedSources);
  const actualResult = resultsList[0];

  const actualClass = actualResult ? actualResult.classification : 'unknown';
  const isPass = actualClass === tc.expectedClassification;

  if (isPass) passedCount++;

  // Confusion matrix logging
  const key = `${tc.expectedClassification} -> ${actualClass}`;
  confusionMatrix[key] = (confusionMatrix[key] || 0) + 1;

  const record = {
    testCaseId: tc.id,
    description: tc.description,
    statement: tc.statement,
    expectedClassification: tc.expectedClassification,
    actualClassification: actualClass,
    similarityScore: actualResult ? actualResult.similarityScore : 0,
    candidateCount: actualResult && actualResult.algorithm ? actualResult.algorithm.candidateCount : 0,
    reason: actualResult ? actualResult.reason : '',
    passed: isPass,
  };

  results.push(record);

  console.log(`[${isPass ? 'PASS' : 'FAIL'}] ${tc.id} (${tc.description}): Expected '${tc.expectedClassification}', Actual '${actualClass}' (Sim: ${record.similarityScore})`);
}

const accuracy = Number(((passedCount / testCases.length) * 100).toFixed(2));

console.log('\n====================================================');
console.log(`ERROR DETECTION ACCURACY: ${passedCount} / ${testCases.length} PASSED (${accuracy}%)`);
console.log('====================================================');
console.log('CONFUSION MATRIX SUMMARY:', JSON.stringify(confusionMatrix, null, 2));

// Persist structured result JSON artifact
const resultsDir = path.join(__dirname, '../results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const outputPayload = {
  generatedAt: new Date().toISOString(),
  algorithm: 'error_detection_tfidf_cosine_heuristics',
  totalTests: testCases.length,
  passed: passedCount,
  failed: testCases.length - passedCount,
  controlledTestDatasetAccuracyPercentage: accuracy,
  confusionMatrix,
  testCases: results,
};

fs.writeFileSync(
  path.join(resultsDir, 'errorDetectionEvaluation.json'),
  JSON.stringify(outputPayload, null, 2)
);

console.log(`Saved evaluation results to ${path.join(resultsDir, 'errorDetectionEvaluation.json')}`);

if (passedCount !== testCases.length) {
  process.exit(1);
}
