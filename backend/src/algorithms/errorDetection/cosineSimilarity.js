/**
 * Calculates Cosine Similarity between two numeric vectors
 * Formula: (A · B) / (||A|| * ||B||)
 * @param {number[]} vectorA 
 * @param {number[]} vectorB 
 * @returns {number} Similarity score between 0.0 and 1.0
 */
function calculateCosineSimilarity(vectorA, vectorB) {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB) || vectorA.length === 0 || vectorB.length === 0) {
    return 0.0;
  }

  if (vectorA.length !== vectorB.length) {
    return 0.0;
  }

  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;

  for (let i = 0; i < vectorA.length; i++) {
    const valA = Number.isFinite(vectorA[i]) ? vectorA[i] : 0;
    const valB = Number.isFinite(vectorB[i]) ? vectorB[i] : 0;

    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  const magnitudeA = Math.sqrt(normA);
  const magnitudeB = Math.sqrt(normB);

  // Handle zero magnitude vectors
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0.0;
  }

  const similarity = dotProduct / (magnitudeA * magnitudeB);

  // Clamp result between 0.0 and 1.0 to guard against precision floating point issues
  return Math.max(0.0, Math.min(1.0, similarity));
}

module.exports = {
  calculateCosineSimilarity,
};
