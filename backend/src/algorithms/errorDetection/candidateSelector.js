const { preprocessText } = require('./textPreprocessor');
const { MAX_CANDIDATES, KEYWORD_OVERLAP_MIN } = require('../../config/analysisConfig');

/**
 * Selects candidate trusted evidence passages relevant to user statement using keyword overlap
 * @param {string} statementText - User statement
 * @param {Array<Object>} activeKnowledgeSources - Trusted knowledge sources from database
 * @returns {Array<Object>} List of top candidate evidence passages
 */
function selectCandidateEvidence(statementText, activeKnowledgeSources) {
  if (!statementText || !activeKnowledgeSources || activeKnowledgeSources.length === 0) {
    return [];
  }

  const statementPrep = preprocessText(statementText);
  const statementTokens = statementPrep.tokens;

  if (statementTokens.length === 0) {
    return [];
  }

  const statementTokenSet = new Set(statementTokens);
  const candidates = [];

  for (const source of activeKnowledgeSources) {
    if (!source.extractedText) continue;

    // Segment source text into sentences/passages
    const passages = source.extractedText.split(/(?<=[.!?])\s+|\n+/);

    for (const passage of passages) {
      const trimmedPassage = passage.trim();
      if (trimmedPassage.length < 15) continue;

      const passagePrep = preprocessText(trimmedPassage);
      const passageTokens = passagePrep.tokens;
      if (passageTokens.length === 0) continue;

      // Count matching tokens
      const matchingTokens = passageTokens.filter(token => statementTokenSet.has(token));
      const uniqueMatchingTokens = new Set(matchingTokens);

      if (uniqueMatchingTokens.size > 0) {
        // Keyword overlap score: fraction of statement tokens matched in passage
        const overlapScore = uniqueMatchingTokens.size / statementTokens.length;

        if (overlapScore >= KEYWORD_OVERLAP_MIN || uniqueMatchingTokens.size >= 2) {
          candidates.push({
            sourceId: source.id,
            sourceTitle: source.title || source.originalName || 'Trusted Source',
            category: source.category || 'General',
            sourceType: source.sourceType || 'file',
            text: trimmedPassage,
            statementTokens,
            passageTokens,
            matchingTokens: Array.from(uniqueMatchingTokens),
            keywordOverlapScore: overlapScore,
          });
        }
      }
    }
  }

  // Sort by keyword overlap score descending
  candidates.sort((a, b) => b.keywordOverlapScore - a.keywordOverlapScore);

  // Take top N candidates
  return candidates.slice(0, MAX_CANDIDATES);
}

module.exports = {
  selectCandidateEvidence,
};
