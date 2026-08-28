const {
  HIGH_SIMILARITY_THRESHOLD,
  MEDIUM_SIMILARITY_THRESHOLD,
  LOW_SIMILARITY_THRESHOLD,
} = require('../../config/analysisConfig');

/**
 * Classifies a statement finding based on Cosine Similarity score and Contradiction Heuristics
 * @param {Object} statementObj - Statement object containing original and normalized statement
 * @param {Object|null} bestCandidate - Best candidate evidence object
 * @param {number} similarityScore - Cosine similarity score (0.0 - 1.0)
 * @param {Object} contradictionResult - Result from contradiction detector
 * @param {number} candidateCount - Number of candidates evaluated
 * @returns {Object} Complete classification result object conforming to Step 9 schema
 */
function classifyFinding(statementObj, bestCandidate, similarityScore, contradictionResult, candidateCount = 0) {
  const originalText = statementObj ? (statementObj.originalStatement || statementObj.statement || '') : '';
  const normalizedText = statementObj ? (statementObj.normalizedStatement || '') : '';

  // 1. Empty or invalid statement safeguard
  if (!originalText || originalText.trim().length === 0) {
    return {
      statement: originalText,
      normalizedStatement: normalizedText,
      classification: 'not_analyzed',
      status: 'not_analyzed',
      similarityScore: 0.0,
      severity: 'low',
      reason: 'Empty or unparseable statement.',
      explanation: 'Empty or unparseable statement.',
      evidence: null,
      algorithm: {
        method: 'tfidf_cosine_similarity',
        candidateCount: 0,
        comparedCount: 0,
        keywordOverlapScore: 0,
      },
    };
  }

  // 2. No candidate evidence found
  if (!bestCandidate || candidateCount === 0) {
    return {
      statement: originalText,
      normalizedStatement: normalizedText,
      classification: 'insufficient_evidence',
      status: 'insufficient_evidence',
      similarityScore: 0.0,
      severity: 'low',
      reason: 'No matching trusted knowledge source evidence found for verification.',
      explanation: 'No matching trusted knowledge source evidence found for verification.',
      evidence: null,
      algorithm: {
        method: 'tfidf_cosine_similarity',
        candidateCount: 0,
        comparedCount: 0,
        keywordOverlapScore: 0,
      },
    };
  }

  const keywordOverlap = bestCandidate.keywordOverlapScore || 0;

  // 3. Contradiction Check Priority
  if (contradictionResult && contradictionResult.isContradiction) {
    const severity = contradictionResult.contradictionType === 'numeric-mismatch' ? 'high' : 'medium';
    return {
      statement: originalText,
      normalizedStatement: normalizedText,
      classification: 'potential_contradiction',
      status: 'potential_contradiction',
      similarityScore: Number(similarityScore.toFixed(4)),
      severity,
      reason: contradictionResult.reason || 'Potential contradiction detected with trusted evidence.',
      explanation: contradictionResult.reason || 'Potential contradiction detected with trusted evidence.',
      evidence: {
        text: bestCandidate.text,
        sourceId: bestCandidate.sourceId,
        sourceTitle: bestCandidate.sourceTitle,
        sourceName: bestCandidate.sourceTitle,
        sourceType: bestCandidate.sourceType,
      },
      algorithm: {
        method: 'tfidf_cosine_similarity',
        candidateCount,
        comparedCount: candidateCount,
        keywordOverlapScore: Number(keywordOverlap.toFixed(4)),
      },
    };
  }

  // 4. Threshold-Based Classification
  if (similarityScore >= HIGH_SIMILARITY_THRESHOLD) {
    return {
      statement: originalText,
      normalizedStatement: normalizedText,
      classification: 'verified',
      status: 'verified',
      similarityScore: Number(similarityScore.toFixed(4)),
      severity: 'low',
      reason: `Statement strongly supported by trusted evidence (Similarity: ${(similarityScore * 100).toFixed(1)}%).`,
      explanation: `Statement strongly supported by trusted evidence (Similarity: ${(similarityScore * 100).toFixed(1)}%).`,
      evidence: {
        text: bestCandidate.text,
        sourceId: bestCandidate.sourceId,
        sourceTitle: bestCandidate.sourceTitle,
        sourceName: bestCandidate.sourceTitle,
        sourceType: bestCandidate.sourceType,
      },
      algorithm: {
        method: 'tfidf_cosine_similarity',
        candidateCount,
        comparedCount: candidateCount,
        keywordOverlapScore: Number(keywordOverlap.toFixed(4)),
      },
    };
  } else if (similarityScore >= MEDIUM_SIMILARITY_THRESHOLD) {
    return {
      statement: originalText,
      normalizedStatement: normalizedText,
      classification: 'verified',
      status: 'verified',
      similarityScore: Number(similarityScore.toFixed(4)),
      severity: 'low',
      reason: `Statement moderately supported by trusted evidence (Similarity: ${(similarityScore * 100).toFixed(1)}%).`,
      explanation: `Statement moderately supported by trusted evidence (Similarity: ${(similarityScore * 100).toFixed(1)}%).`,
      evidence: {
        text: bestCandidate.text,
        sourceId: bestCandidate.sourceId,
        sourceTitle: bestCandidate.sourceTitle,
        sourceName: bestCandidate.sourceTitle,
        sourceType: bestCandidate.sourceType,
      },
      algorithm: {
        method: 'tfidf_cosine_similarity',
        candidateCount,
        comparedCount: candidateCount,
        keywordOverlapScore: Number(keywordOverlap.toFixed(4)),
      },
    };
  } else {
    // Low similarity alone does NOT prove contradiction -> insufficient_evidence
    return {
      statement: originalText,
      normalizedStatement: normalizedText,
      classification: 'insufficient_evidence',
      status: 'insufficient_evidence',
      similarityScore: Number(similarityScore.toFixed(4)),
      severity: 'low',
      reason: `Available trusted evidence is insufficient or inconclusive (Similarity: ${(similarityScore * 100).toFixed(1)}%).`,
      explanation: `Available trusted evidence is insufficient or inconclusive (Similarity: ${(similarityScore * 100).toFixed(1)}%).`,
      evidence: {
        text: bestCandidate.text,
        sourceId: bestCandidate.sourceId,
        sourceTitle: bestCandidate.sourceTitle,
        sourceName: bestCandidate.sourceTitle,
        sourceType: bestCandidate.sourceType,
      },
      algorithm: {
        method: 'tfidf_cosine_similarity',
        candidateCount,
        comparedCount: candidateCount,
        keywordOverlapScore: Number(keywordOverlap.toFixed(4)),
      },
    };
  }
}

module.exports = {
  classifyFinding,
};
