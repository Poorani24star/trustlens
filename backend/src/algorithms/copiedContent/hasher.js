const crypto = require('crypto');

/**
 * Generates a deterministic SHA-256 hash for a given text string
 * @param {string} text 
 * @returns {string} Hexadecimal SHA-256 hash string
 */
function generateHash(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return crypto
    .createHash('sha256')
    .update(text)
    .digest('hex');
}

module.exports = {
  generateHash,
};
