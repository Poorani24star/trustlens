const {
  HIGH_SIMILARITY_THRESHOLD,
  MEDIUM_SIMILARITY_THRESHOLD,
  JACCARD_WEIGHT,
  LEVENSHTEIN_WEIGHT,
} = require('../../config/copiedContentConfig');

/**
 * Calculates combined similarity score and classifies match type
 * @param {Object} passageA 
 * @param {Object} passageB 
 * @param {string} hashA 
 * @param {string} hashB 
 * @param {number} jaccardScore 
 * @param {number} levenshteinScore 
 * @returns {{matchType: string, jaccardSimilarity: number, levenshteinSimilarity: number, combinedSimilarity: number, similarityPercentage: number}}
 */
function classifyMatch(passageA, passageB, hashA, hashB, jaccardScore = 0.0, levenshteinScore = 0.0) {
  if (!passageA || !passageB || !passageA.normalizedText || !passageB.normalizedText) {
    return {
      matchType: 'no_match',
      jaccardSimilarity: 0.0,
      levenshteinSimilarity: 0.0,
      combinedSimilarity: 0.0,
      similarityPercentage: 0,
    };
  }

  // 1. Exact Match Check via Normalized Text or Cryptographic Hash
  if (hashA === hashB || passageA.normalizedText === passageB.normalizedText) {
    return {
      matchType: 'exact_match',
      jaccardSimilarity: 1.0,
      levenshteinSimilarity: 1.0,
      combinedSimilarity: 1.0,
      similarityPercentage: 100,
    };
  }

  // 2. Weighted Combined Similarity Score
  const combined = (JACCARD_WEIGHT * jaccardScore) + (LEVENSHTEIN_WEIGHT * levenshteinScore);
  const similarityPercentage = Math.round(combined * 100);

  // 3. Classification thresholding
  if (combined >= HIGH_SIMILARITY_THRESHOLD) {
    return {
      matchType: 'near_identical',
      jaccardSimilarity: Number(jaccardScore.toFixed(4)),
      levenshteinSimilarity: Number(levenshteinScore.toFixed(4)),
      combinedSimilarity: Number(combined.toFixed(4)),
      similarityPercentage,
    };
  } else if (combined >= MEDIUM_SIMILARITY_THRESHOLD) {
    return {
      matchType: 'partial_match',
      jaccardSimilarity: Number(jaccardScore.toFixed(4)),
      levenshteinSimilarity: Number(levenshteinScore.toFixed(4)),
      combinedSimilarity: Number(combined.toFixed(4)),
      similarityPercentage,
    };
  } else {
    return {
      matchType: 'no_match',
      jaccardSimilarity: Number(jaccardScore.toFixed(4)),
      levenshteinSimilarity: Number(levenshteinScore.toFixed(4)),
      combinedSimilarity: Number(combined.toFixed(4)),
      similarityPercentage,
    };
  }
}

module.exports = {
  classifyMatch,
};
