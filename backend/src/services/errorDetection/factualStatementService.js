const OPINION_PATTERNS = [
  /^(i think|i believe|in my opinion|i feel|i guess|it seems to me|i personally|my view is|from my perspective)\b/i,
  /\b(in my opinion|i personally think|i feel that)\b/i
];

const FACTUAL_VERBS = /\b(is|was|are|were|has|have|had|refers to|defined as|founded|created|invented|discovered|located|contains|includes|consists of|equals|established|built|produced|generated|measured)\b/i;

const NUMERIC_PATTERN = /\b(\d+|\d+%\b|19\d{2}|20\d{2})\b/;

/**
 * Determines whether a statement is a candidate factual claim for verification
 */
function isFactualStatement(statementText) {
  if (!statementText || typeof statementText !== 'string') {
    return false;
  }

  const cleaned = statementText.trim();
  const words = cleaned.split(/\s+/);

  // Very short statements (< 3 words) are usually not complete factual claims
  if (words.length < 3) {
    return false;
  }

  // Check for subjective/opinion markers
  for (const pattern of OPINION_PATTERNS) {
    if (pattern.test(cleaned)) {
      return false; // Subjective opinion
    }
  }

  // If it contains numbers/dates or factual assertion verbs, consider it factual candidate
  if (NUMERIC_PATTERN.test(cleaned) || FACTUAL_VERBS.test(cleaned)) {
    return true;
  }

  return false;
}

module.exports = {
  isFactualStatement,
};
