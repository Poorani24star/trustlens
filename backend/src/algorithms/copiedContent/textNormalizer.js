/**
 * Normalizes document text for comparison while preserving original text for display
 * @param {string} text 
 * @returns {string} Normalized string (lowercased, punctuation replaced with space, single spaced)
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  normalizeText,
};
