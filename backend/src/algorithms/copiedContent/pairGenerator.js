/**
 * Generates unique document pairs for comparison: N * (N - 1) / 2
 * @param {Array<Object>} documents 
 * @returns {Array<{pairId: string, docA: Object, docB: Object}>}
 */
function generatePairs(documents) {
  if (!Array.isArray(documents) || documents.length < 2) {
    return [];
  }

  // Consistent stable sort by documentId to prevent reversed duplicate pairs
  const sortedDocs = [...documents].sort((a, b) => (a.documentId || '').localeCompare(b.documentId || ''));
  const pairs = [];

  for (let i = 0; i < sortedDocs.length; i++) {
    for (let j = i + 1; j < sortedDocs.length; j++) {
      const docA = sortedDocs[i];
      const docB = sortedDocs[j];
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
  generatePairs,
};
