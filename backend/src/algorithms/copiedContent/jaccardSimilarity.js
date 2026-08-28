/**
 * Calculates Jaccard Similarity between two sets (shingle sets or token sets)
 * Formula: |A ∩ B| / |A ∪ B|
 * @param {Set<string>} setA 
 * @param {Set<string>} setB 
 * @returns {number} Score between 0.0 and 1.0
 */
function calculateJaccard(setA, setB) {
  if (!(setA instanceof Set) || !(setB instanceof Set) || setA.size === 0 || setB.size === 0) {
    return 0.0;
  }

  // Optimize iteration by checking the smaller set against the larger set
  const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];

  let intersectionCount = 0;
  for (const item of smaller) {
    if (larger.has(item)) {
      intersectionCount++;
    }
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  if (unionCount === 0) return 0.0;

  return intersectionCount / unionCount;
}

/**
 * Calculates combined passage Jaccard similarity considering both word shingles and word tokens
 * @param {string} textA 
 * @param {string} textB 
 * @param {Set<string>} shingleSetA 
 * @param {Set<string>} shingleSetB 
 * @returns {number} Jaccard score between 0.0 and 1.0
 */
function calculatePassageJaccard(textA, textB, shingleSetA, shingleSetB) {
  const shingleJaccard = calculateJaccard(shingleSetA, shingleSetB);

  // Word token set extraction
  const tokensA = new Set((textA || '').split(/\s+/).filter(Boolean));
  const tokensB = new Set((textB || '').split(/\s+/).filter(Boolean));
  const tokenJaccard = calculateJaccard(tokensA, tokensB);

  // Maximize precision and recall across shingle N-grams and unigram word tokens
  return Math.max(shingleJaccard, tokenJaccard);
}

module.exports = {
  calculateJaccard,
  calculatePassageJaccard,
};
