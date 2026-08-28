/**
 * Reusable Text Normalization Utility
 * Cleans extracted text without altering semantic meaning or removing punctuation/words.
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    // Normalize line endings to \n
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Replace non-breaking spaces with standard space
    .replace(/\u00A0/g, ' ')
    // Replace multiple horizontal spaces/tabs on a single line with a single space
    .replace(/[ \t]+/g, ' ')
    // Ensure space after punctuation if missing (without breaking numbers or URLs)
    // Reduce 3+ consecutive newlines to 2 newlines (preserve paragraphs)
    .replace(/\n{3,}/g, '\n\n')
    // Trim leading/trailing line whitespace
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

module.exports = {
  normalizeText,
};
