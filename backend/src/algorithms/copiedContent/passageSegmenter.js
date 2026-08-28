const { normalizeText } = require('./textNormalizer');
const { MIN_PASSAGE_LENGTH } = require('../../config/copiedContentConfig');

/**
 * Splits document text into comparison passage units with positional tracking
 * @param {string} documentId 
 * @param {string} documentName 
 * @param {string} text 
 * @returns {Array<{passageId: string, documentId: string, documentName: string, passageIndex: number, position: number, originalText: string, normalizedText: string}>}
 */
function segmentPassages(documentId, documentName, text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const rawBlocks = text.split(/\n+/);
  const passages = [];
  let index = 1;

  for (const block of rawBlocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

    // Split block into sentences using boundary punctuation
    const sentences = trimmedBlock.split(/(?<=[.!?])\s+/);

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length >= MIN_PASSAGE_LENGTH) {
        const normalized = normalizeText(trimmedSentence);
        if (normalized.length > 0) {
          passages.push({
            passageId: `${documentId}-p-${index}`,
            documentId,
            documentName,
            passageIndex: index,
            position: index,
            originalText: trimmedSentence,
            normalizedText: normalized,
          });
          index++;
        }
      }
    }
  }

  // Fallback for text block without sentence punctuation but text >= MIN_PASSAGE_LENGTH
  if (passages.length === 0 && text.trim().length >= MIN_PASSAGE_LENGTH) {
    const normalized = normalizeText(text.trim());
    if (normalized.length > 0) {
      passages.push({
        passageId: `${documentId}-p-1`,
        documentId,
        documentName,
        passageIndex: 1,
        position: 1,
        originalText: text.trim(),
        normalizedText: normalized,
      });
    }
  }

  return passages;
}

module.exports = {
  segmentPassages,
};
