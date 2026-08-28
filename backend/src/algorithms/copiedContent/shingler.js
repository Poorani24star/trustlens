const { generateHash } = require('./hasher');
const { SHINGLE_SIZE } = require('../../config/copiedContentConfig');

/**
 * Generates word-level N-gram shingles and shingle hashes for a normalized passage
 * @param {string} normalizedText 
 * @param {number} n - Shingle size (default from config: 5)
 * @returns {{shingles: string[], shingleHashes: string[], shingleSet: Set<string>}}
 */
function generateShingles(normalizedText, n = SHINGLE_SIZE) {
  if (!normalizedText || typeof normalizedText !== 'string') {
    return { shingles: [], shingleHashes: [], shingleSet: new Set() };
  }

  const words = normalizedText.split(/\s+/).filter(Boolean);

  // If text is shorter than N words, use all words as a single shingle
  if (words.length < n) {
    if (words.length === 0) {
      return { shingles: [], shingleHashes: [], shingleSet: new Set() };
    }
    const singleShingle = words.join(' ');
    const hash = generateHash(singleShingle);
    return {
      shingles: [singleShingle],
      shingleHashes: [hash],
      shingleSet: new Set([singleShingle]),
    };
  }

  const shingles = [];
  const shingleHashes = [];
  const shingleSet = new Set();

  for (let i = 0; i <= words.length - n; i++) {
    const shingle = words.slice(i, i + n).join(' ');
    shingles.push(shingle);
    shingleSet.add(shingle);

    const hash = generateHash(shingle);
    shingleHashes.push(hash);
  }

  return {
    shingles,
    shingleHashes,
    shingleSet,
  };
}

module.exports = {
  generateShingles,
};
