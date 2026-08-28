const { NEAR_MATCH_THRESHOLD } = require('./copiedContentConfig');

/**
 * Tokenizes text into a set of lowercased word tokens
 */
function getWordTokenSet(normalizedText) {
  if (!normalizedText) return new Set();
  const words = normalizedText.split(/\s+/).filter(w => w.length > 0);
  return new Set(words);
}

/**
 * Calculates Jaccard similarity coefficient between two token sets: |A ∩ B| / |A ∪ B|
 */
function calculateJaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount > 0 ? intersectionCount / unionCount : 0;
}

/**
 * Compares two passage units and classifies match as exact-match, near-match, or no-match
 */
function comparePassages(passageA, passageB) {
  if (!passageA || !passageB || !passageA.normalizedText || !passageB.normalizedText) {
    return { matchType: 'no-match', similarity: 0 };
  }

  // Exact Match Check
  if (passageA.normalizedText === passageB.normalizedText) {
    return {
      matchType: 'exact-match',
      similarity: 100,
    };
  }

  // Near Match Check using Jaccard Token Similarity
  const tokensA = getWordTokenSet(passageA.normalizedText);
  const tokensB = getWordTokenSet(passageB.normalizedText);
  const jaccardScore = calculateJaccardSimilarity(tokensA, tokensB);

  if (jaccardScore >= NEAR_MATCH_THRESHOLD) {
    return {
      matchType: 'near-match',
      similarity: Math.round(jaccardScore * 100),
    };
  }

  return {
    matchType: 'no-match',
    similarity: Math.round(jaccardScore * 100),
  };
}

module.exports = {
  comparePassages,
  calculateJaccardSimilarity,
  getWordTokenSet,
};
