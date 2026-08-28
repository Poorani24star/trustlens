const { STOP_WORDS } = require('../../config/analysisConfig');

/**
 * Preprocesses input text for TF-IDF and similarity calculation
 * @param {string} text - Raw input sentence or document passage
 * @returns {{normalizedText: string, tokens: string[], rawTokens: string[]}}
 */
function preprocessText(text) {
  if (!text || typeof text !== 'string') {
    return {
      normalizedText: '',
      tokens: [],
      rawTokens: [],
    };
  }

  // 1. Lowercase & normalize whitespace
  const lowercased = text.toLowerCase().trim();

  // 2. Remove punctuation
  const cleanText = lowercased.replace(/[^\w\s]/g, ' ');
  const normalizedText = cleanText.replace(/\s+/g, ' ').trim();

  // 3. Tokenize
  const rawTokens = normalizedText.split(/\s+/).filter(Boolean);

  // 4. Remove stop words & filter short tokens (<2 chars unless digit)
  const tokens = rawTokens.filter(t => {
    if (STOP_WORDS.has(t)) return false;
    return t.length > 1 || /\d/.test(t);
  });

  return {
    normalizedText,
    tokens,
    rawTokens,
  };
}

module.exports = {
  preprocessText,
};
