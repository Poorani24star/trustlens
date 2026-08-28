/**
 * Deterministic Contradiction Detector Heuristic
 */

const NUMERIC_REGEX = /\b(\d+(?:\.\d+)?%?|\d{4})\b/g;

// Explicit negation words for polarity conflict detection
const NEGATION_WORDS = new Set(['not', 'no', 'never', 'neither', 'nor', 'cannot', 'can\'t', 'don\'t', 'doesn\'t', 'won\'t', 'isn\'t', 'aren\'t', 'wasn\'t', 'weren\'t']);

/**
 * Extracts numbers, percentages, and years from text
 * @param {string} text 
 * @returns {string[]}
 */
function extractNumbers(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(NUMERIC_REGEX);
  return matches ? matches.map(m => m.trim()) : [];
}

/**
 * Checks if a string contains negation words
 * @param {string} text 
 * @returns {boolean}
 */
function hasNegation(text) {
  if (!text) return false;
  const words = text.toLowerCase().split(/\s+/);
  return words.some(w => NEGATION_WORDS.has(w));
}

/**
 * Evaluates whether user statement conflicts with candidate trusted evidence
 * @param {string} statementText 
 * @param {string} evidenceText 
 * @param {string[]} matchingTokens 
 * @param {number} similarityScore 
 * @returns {{isContradiction: boolean, contradictionType: string|null, reason: string|null}}
 */
function detectContradiction(statementText, evidenceText, matchingTokens = [], similarityScore = 0) {
  if (!statementText || !evidenceText) {
    return { isContradiction: false, contradictionType: null, reason: null };
  }

  const statementNums = extractNumbers(statementText);
  const evidenceNums = extractNumbers(evidenceText);

  // 1. Numeric / Quantitative Contradiction Check
  // Discusses same entity (matchingTokens >= 1 or similarity > 0.25) but contains conflicting numeric values
  if (statementNums.length > 0 && evidenceNums.length > 0) {
    const numericMismatch = statementNums.some(num => !evidenceNums.includes(num));

    if (numericMismatch && (matchingTokens.length >= 1 || similarityScore >= 0.25)) {
      return {
        isContradiction: true,
        contradictionType: 'numeric-mismatch',
        reason: `Value discrepancy: Statement asserts '${statementNums.join(', ')}' whereas trusted source indicates '${evidenceNums.join(', ')}'.`,
      };
    }
  }

  // 2. Explicit Negation Contradiction Check
  // High entity/context overlap (matchingTokens >= 2 or similarityScore >= 0.35) but one text has negation while the other does not
  const statementNeg = hasNegation(statementText);
  const evidenceNeg = hasNegation(evidenceText);

  if (statementNeg !== evidenceNeg && (matchingTokens.length >= 2 || similarityScore >= 0.35)) {
    return {
      isContradiction: true,
      contradictionType: 'negation-contrast',
      reason: `Polarity discrepancy: Statement contains negation (${statementNeg ? 'negative' : 'affirmative'}) contrasting with trusted evidence (${evidenceNeg ? 'negative' : 'affirmative'}).`,
    };
  }

  return {
    isContradiction: false,
    contradictionType: null,
    reason: null,
  };
}

module.exports = {
  extractNumbers,
  hasNegation,
  detectContradiction,
};
