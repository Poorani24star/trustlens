const { MIN_PASSAGE_CHAR_LENGTH } = require('./copiedContentConfig');

/**
 * Normalizes text for similarity comparison (lowercased, punctuation replaced by space, single spaced)
 */
function normalizeForComparison(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Chunks document text into comparison passage units
 */
function chunkDocumentIntoPassages(documentId, text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Split text into paragraphs/lines first
  const rawBlocks = text.split(/\n+/);
  const passages = [];
  let index = 1;

  for (const block of rawBlocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

    // Split block into sentences using boundary regex
    const sentences = trimmedBlock.split(/(?<=[.!?])\s+/);

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length >= MIN_PASSAGE_CHAR_LENGTH) {
        passages.push({
          passageId: `${documentId}-passage-${index}`,
          documentId,
          passageIndex: index,
          originalText: trimmedSentence,
          normalizedText: normalizeForComparison(trimmedSentence),
        });
        index++;
      }
    }
  }

  // Fallback: If no sentence-level passages produced but block has text >= MIN_PASSAGE_CHAR_LENGTH
  if (passages.length === 0 && text.trim().length >= MIN_PASSAGE_CHAR_LENGTH) {
    passages.push({
      passageId: `${documentId}-passage-1`,
      documentId,
      passageIndex: 1,
      originalText: text.trim(),
      normalizedText: normalizeForComparison(text.trim()),
    });
  }

  return passages;
}

module.exports = {
  chunkDocumentIntoPassages,
  normalizeForComparison,
};
