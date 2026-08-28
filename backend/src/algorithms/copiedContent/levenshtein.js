const { MAX_LEVENSHTEIN_LENGTH } = require('../../config/copiedContentConfig');

/**
 * Calculates raw Levenshtein distance between two strings
 * @param {string} strA 
 * @param {string} strB 
 * @returns {number} Edit distance
 */
function calculateRawLevenshtein(strA, strB) {
  const lenA = strA.length;
  const lenB = strB.length;

  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  // Single row memory optimization
  let prevRow = new Array(lenB + 1);
  let currRow = new Array(lenB + 1);

  for (let j = 0; j <= lenB; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= lenA; i++) {
    currRow[0] = i;
    const charA = strA.charCodeAt(i - 1);

    for (let j = 1; j <= lenB; j++) {
      const cost = charA === strB.charCodeAt(j - 1) ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,      // Deletion
        currRow[j - 1] + 1,  // Insertion
        prevRow[j - 1] + cost // Substitution
      );
    }

    // Swap row references
    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[lenB];
}

/**
 * Calculates normalized Levenshtein similarity: 1 - (distance / maxLen)
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number} Similarity score between 0.0 and 1.0
 */
function calculateLevenshteinSimilarity(str1, str2) {
  if (!str1 || !str2) return 0.0;
  if (str1 === str2) return 1.0;

  // Truncate to MAX_LEVENSHTEIN_LENGTH if needed to guard performance
  const s1 = str1.length > MAX_LEVENSHTEIN_LENGTH ? str1.substring(0, MAX_LEVENSHTEIN_LENGTH) : str1;
  const s2 = str2.length > MAX_LEVENSHTEIN_LENGTH ? str2.substring(0, MAX_LEVENSHTEIN_LENGTH) : str2;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const distance = calculateRawLevenshtein(s1, s2);
  const similarity = 1.0 - (distance / maxLen);

  return Math.max(0.0, Math.min(1.0, similarity));
}

module.exports = {
  calculateRawLevenshtein,
  calculateLevenshteinSimilarity,
};
