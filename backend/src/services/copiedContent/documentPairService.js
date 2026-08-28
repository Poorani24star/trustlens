/**
 * Generates unique pairwise combinations of documents without self-comparison or inverted duplicates
 * N documents -> N(N-1)/2 pairs
 */
function generateDocumentPairs(documents) {
  if (!Array.isArray(documents) || documents.length < 2) {
    return [];
  }

  const pairs = [];

  for (let i = 0; i < documents.length; i++) {
    for (let j = i + 1; j < documents.length; j++) {
      const docA = documents[i];
      const docB = documents[j];
      const pairId = `pair_${docA.documentId}_vs_${docB.documentId}`;

      pairs.push({
        pairId,
        docA,
        docB,
      });
    }
  }

  return pairs;
}

module.exports = {
  generateDocumentPairs,
};
