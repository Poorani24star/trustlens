const { analyzeStatementsAgainstSources } = require('../../services/errorDetection/errorDetectionService');
const { analyzeCopiedContentDocuments } = require('../../services/copiedContent/copiedContentService');

console.log('====================================================');
console.log('RUNNING PHASE 13C: PERFORMANCE BENCHMARKING');
console.log('====================================================');

// 1. ERROR DETECTION BENCHMARK (5, 20, 50 Statements)
console.log('\n--- Part 12A: Error Detection Scaling Benchmark ---');

const mockSources = [
  { id: 's1', title: 'CS Docs', extractedText: 'Cloud computing provides on-demand access to computing resources over the internet. Virtual machines enable cloud elasticity.' },
  { id: 's2', title: 'Earth Science', extractedText: 'The Earth is approximately 4.54 billion years old. Radiometric dating confirms geological timelines.' },
  { id: 's3', title: 'Physics Basics', extractedText: 'Water boils at 100 degrees Celsius at standard atmospheric pressure. Heat transfers via conduction, convection, and radiation.' },
];

function benchmarkErrorDetection(count) {
  const statements = [];
  const baseStatements = [
    'Cloud computing provides on-demand access to computing resources.',
    'The Earth is approximately 4.54 billion years old.',
    'Water boils at 100 degrees Celsius at standard atmospheric pressure.',
    'Photosynthesis converts light energy into chemical energy in plants.',
    'TCP provides reliable data delivery across networks.',
  ];

  for (let i = 0; i < count; i++) {
    statements.push(`${baseStatements[i % baseStatements.length]} (Ref #${i + 1})`);
  }

  const start = Date.now();
  const { resultsList, summary } = analyzeStatementsAgainstSources(statements, mockSources);
  const duration = Date.now() - start;

  let totalCandidates = 0;
  for (const r of resultsList) {
    if (r.algorithm) totalCandidates += r.algorithm.candidateCount;
  }

  console.log(`[BENCHMARK ED] ${count} Statements:`);
  console.log(`  - Total Analyzed: ${summary.analyzedStatements}`);
  console.log(`  - Candidate Evidence Retrieved: ${totalCandidates}`);
  console.log(`  - Execution Time: ${duration} ms\n`);
}

benchmarkErrorDetection(5);
benchmarkErrorDetection(20);
benchmarkErrorDetection(50);

// 2. COPIED CONTENT BENCHMARK (2, 5, 10 Documents)
console.log('--- Part 12B: Copied Content Detection Scaling Benchmark ---');

function benchmarkCopiedContent(docCount) {
  const docs = [];
  for (let i = 1; i <= docCount; i++) {
    docs.push({
      documentId: `bench-doc-${i}`,
      originalName: `Document_${i}.txt`,
      extractedText: `Paragraph ${i} for performance benchmarking of copied content detection algorithm. Cloud computing provides scalable infrastructure, storage, and computing services through the internet. Distributed systems rely on fault tolerance and consensus protocols.`,
    });
  }

  const start = Date.now();
  const { pairResults, summary } = analyzeCopiedContentDocuments(docs);
  const duration = Date.now() - start;

  let totalPassageComparisons = 0;
  let totalLevenshteinCandidates = 0;

  for (const pair of pairResults) {
    if (pair.comparison) {
      totalPassageComparisons += pair.comparison.passagesCompared;
      totalLevenshteinCandidates += pair.comparison.candidatePairs;
    }
  }

  const skipRate = totalPassageComparisons > 0
    ? (((totalPassageComparisons - totalLevenshteinCandidates) / totalPassageComparisons) * 100).toFixed(1)
    : 0;

  console.log(`[BENCHMARK CC] ${docCount} Documents:`);
  console.log(`  - Unique Document Pairs: ${summary.totalDocumentPairs} (${docCount} * ${docCount - 1} / 2)`);
  console.log(`  - Total Passage Comparisons: ${totalPassageComparisons}`);
  console.log(`  - Levenshtein Candidates Evaluated: ${totalLevenshteinCandidates}`);
  console.log(`  - Candidate Filtering Skip Rate: ${skipRate}%`);
  console.log(`  - Execution Time: ${duration} ms\n`);
}

benchmarkCopiedContent(2);
benchmarkCopiedContent(5);
benchmarkCopiedContent(10);

console.log('====================================================');
console.log('PERFORMANCE BENCHMARKING COMPLETE.');
console.log('====================================================');
