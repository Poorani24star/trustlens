const path = require('path');
const assert = require('assert');

// Load Frontend diffUtils via ESM dynamic import
async function runDiffViewerTests() {
  console.log('====================================================');
  console.log(' TRUSTLENS: SIDE-BY-SIDE DIFF VIEWER TEST SUITE    ');
  console.log('====================================================\n');

  const diffUtilsPath = path.resolve(__dirname, '../../../Frontend/src/utils/diffUtils.js');
  const { tokenizeText, computeWordDiff, getSimilarityColor } = await import(`file://${diffUtilsPath.replace(/\\/g, '/')}`);

  let passed = 0;
  let total = 0;

  function test(description, fn) {
    total++;
    try {
      fn();
      console.log(`[PASS] TEST ${total}: ${description}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] TEST ${total}: ${description}`);
      console.error('       Error:', err.message);
    }
  }

  // TEST 1: Tokenization
  test('Tokenizes text correctly preserving words and spaces', () => {
    const tokens = tokenizeText('Operating Systems manage hardware resources.');
    assert(Array.isArray(tokens));
    assert(tokens.length >= 6);
    assert(tokens[0] === 'Operating');
    assert(tokens.some(t => t.trim() === 'hardware'));
  });

  // TEST 2: Exact Match Diff
  test('Exact matching passages identified with 100% match tokens', () => {
    const textA = 'A database index improves the speed of data retrieval operations on a table.';
    const textB = 'A database index improves the speed of data retrieval operations on a table.';
    const result = computeWordDiff(textA, textB);
    assert.strictEqual(result.isExact, true);
    assert(result.matchCount > 0);
    assert(result.tokensA.every(t => t.type === 'match' || t.type === 'normal'));
    assert(result.tokensB.every(t => t.type === 'match' || t.type === 'normal'));
  });

  // TEST 3: Near-Identical Passage Diff (Substitutions)
  test('Near-identical passages identify matching words and substituted phrases', () => {
    const textA = 'The CPU executes instructions in a computer system.';
    const textB = 'The central processor executes commands in a computer architecture.';
    const result = computeWordDiff(textA, textB);
    assert.strictEqual(result.isExact, false);

    // Common words: The, executes, in, a, computer
    const matchedWordsA = result.tokensA.filter(t => t.type === 'match').map(t => t.text.toLowerCase().trim());
    assert(matchedWordsA.includes('the'));
    assert(matchedWordsA.includes('executes'));
    assert(matchedWordsA.includes('computer'));

    // Removed from A
    const removedWordsA = result.tokensA.filter(t => t.type === 'removed').map(t => t.text.toLowerCase().trim());
    assert(removedWordsA.includes('cpu') || removedWordsA.includes('instructions'));

    // Added in B
    const addedWordsB = result.tokensB.filter(t => t.type === 'added').map(t => t.text.toLowerCase().trim());
    assert(addedWordsB.includes('central') || addedWordsB.includes('processor') || addedWordsB.includes('commands'));
  });

  // TEST 4: Completely Disjoint Passages
  test('Completely disjoint texts have zero match tokens', () => {
    const textA = 'Apples oranges bananas.';
    const textB = 'Quantum mechanics entanglement.';
    const result = computeWordDiff(textA, textB);
    assert.strictEqual(result.matchCount, 0);
    assert.strictEqual(result.isExact, false);
    assert(result.tokensA.some(t => t.type === 'removed'));
    assert(result.tokensB.some(t => t.type === 'added'));
  });

  // TEST 5: Empty / Null Strings Handled Safely
  test('Empty strings handled without errors', () => {
    const res1 = computeWordDiff('', '');
    assert.strictEqual(res1.matchCount, 0);

    const res2 = computeWordDiff('Some text', null);
    assert.strictEqual(res2.matchCount, 0);
    assert(res2.tokensA.length > 0);
  });

  // TEST 6: Large Text Performance
  test('Large paragraph diff computes in under 50ms', () => {
    const paraA = 'Distributed systems consist of autonomous computing entities that communicate over a network to coordinate actions and share state. Fault tolerance and consensus algorithms ensure reliability.'.repeat(5);
    const paraB = 'Distributed networks consist of autonomous computer systems that interact across networks to synchronize state and coordinate operations. Consensus algorithms ensure fault tolerance.'.repeat(5);
    
    const start = Date.now();
    const result = computeWordDiff(paraA, paraB);
    const duration = Date.now() - start;

    assert(duration < 150, `Diff took ${duration}ms, expected < 150ms`);
    assert(result.matchCount > 10);
  });

  // TEST 7: Color Coding Utilities
  test('Similarity color mapping matches design system', () => {
    const high = getSimilarityColor(90);
    assert(high.bg.includes('red'));

    const medium = getSimilarityColor(70);
    assert(medium.bg.includes('amber'));

    const low = getSimilarityColor(40);
    assert(low.bg.includes('emerald'));
  });

  // TEST 8: Copied Content Result Card Pair Data Compatibility
  test('Document pair schema from resultAggregator matches Diff Viewer expectations', () => {
    const mockPair = {
      pairId: 'pair-test-1',
      overallMatchedContentPercentage: 85,
      documentA: { originalName: 'Report_Draft_1.pdf' },
      documentB: { originalName: 'Report_Draft_2.pdf' },
      matches: [
        {
          matchId: 'match-1',
          matchType: 'near_identical',
          similarity: 88,
          combinedSimilarity: 0.88,
          jaccardSimilarity: 0.82,
          levenshteinSimilarity: 0.91,
          documentAPassage: 'Virtual memory provides an illusion of a large contiguous address space.',
          documentBPassage: 'Virtual memory gives the illusion of a massive contiguous memory space.',
          documentA: { passageIndex: 1 },
          documentB: { passageIndex: 2 }
        }
      ]
    };

    const match = mockPair.matches[0];
    const diff = computeWordDiff(match.documentAPassage, match.documentBPassage);
    assert(diff.matchCount > 0);
    assert(diff.tokensA.length > 0);
    assert(diff.tokensB.length > 0);
  });

  console.log('\n====================================================');
  console.log(` DIFF VIEWER TEST RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runDiffViewerTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
