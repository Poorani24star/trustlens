const {
  CANDIDATE_TOKEN_OVERLAP_THRESHOLD,
  CANDIDATE_JACCARD_THRESHOLD,
} = require('../../config/copiedContentConfig');

/**
 * Evaluates whether a passage pair is a viable candidate for detailed Levenshtein comparison
 * @param {Object} passageA 
 * @param {Object} passageB 
 * @param {number} jaccardScore 
 * @returns {boolean}
 */
function isCandidateForLevenshtein(passageA, passageB, jaccardScore = 0) {
  if (!passageA || !passageB || !passageA.normalizedText || !passageB.normalizedText) {
    return false;
  }

  // 1. If Jaccard score already meets candidate threshold, accept
  if (jaccardScore >= CANDIDATE_JACCARD_THRESHOLD) {
    return true;
  }

  // 2. Length difference safeguard: If length ratio is extreme (< 0.40), skip
  const lenA = passageA.normalizedText.length;
  const lenB = passageB.normalizedText.length;
  const ratio = Math.min(lenA, lenB) / Math.max(lenA, lenB);

  if (ratio < 0.40) {
    return false;
  }

  // 3. Quick token overlap check
  const wordsA = passageA.normalizedText.split(/\s+/);
  const wordsB = new Set(passageB.normalizedText.split(/\s+/));
  const matchingWords = wordsA.filter(w => wordsB.has(w));
  const tokenOverlap = matchingWords.length / Math.min(wordsA.length, wordsB.size || 1);

  return tokenOverlap >= CANDIDATE_TOKEN_OVERLAP_THRESHOLD;
}

module.exports = {
  isCandidateForLevenshtein,
};
