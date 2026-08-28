const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
  'of', 'to', 'in', 'and', 'or', 'for', 'with', 'on', 'at', 'by', 'from',
  'it', 'that', 'this', 'these', 'those', 'as', 'an', 'into', 'has', 'have'
]);

/**
 * Tokenizes text into meaningful term array (lowercased, punctuation removed, stopwords filtered)
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 2 && !STOPWORDS.has(term));
}

/**
 * Searches active trusted knowledge sources for evidence passages relevant to the statement
 */
function findRelevantEvidence(statementText, activeKnowledgeSources) {
  if (!statementText || !activeKnowledgeSources || activeKnowledgeSources.length === 0) {
    return [];
  }

  const statementTerms = tokenize(statementText);
  if (statementTerms.length === 0) {
    return [];
  }

  const candidates = [];

  for (const source of activeKnowledgeSources) {
    if (!source.extractedText) continue;

    // Split source text into sentences
    const passages = source.extractedText.split(/(?<=[.!?])\s+|\n+/);

    for (const passage of passages) {
      const trimmedPassage = passage.trim();
      if (trimmedPassage.length < 15) continue;

      const passageTerms = tokenize(trimmedPassage);
      if (passageTerms.length === 0) continue;

      // Find overlapping terms
      const matchingTerms = statementTerms.filter(term => passageTerms.includes(term));
      
      if (matchingTerms.length > 0) {
        const overlapScore = matchingTerms.length / Math.min(statementTerms.length, passageTerms.length);

        if (matchingTerms.length >= 2 || overlapScore >= 0.3) {
          candidates.push({
            sourceId: source.id,
            sourceTitle: source.title,
            category: source.category || 'General',
            sourceType: source.sourceType || 'file',
            text: trimmedPassage,
            matchingTerms,
            score: overlapScore,
          });
        }
      }
    }
  }

  // Sort candidates by match score descending and take top 5
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 5);
}

module.exports = {
  findRelevantEvidence,
  tokenize,
};
