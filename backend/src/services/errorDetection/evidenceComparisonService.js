const { evaluateSeverity } = require('./severityService');

const NUMERIC_REGEX = /\b(\d+(?:\.\d+)?%?|\d{4})\b/g;

/**
 * Extracts numeric tokens (numbers, years, percentages) from a string
 */
function extractNumbers(text) {
  if (!text) return [];
  const matches = text.match(NUMERIC_REGEX);
  return matches ? matches.map(m => m.trim()) : [];
}

/**
 * Compares candidate statement with retrieved evidence passages
 */
function compareStatementWithEvidence(statementText, evidenceList) {
  if (!evidenceList || evidenceList.length === 0) {
    return {
      classification: 'insufficient-evidence',
      severity: null,
      reason: 'No matching trusted evidence found.',
      evidence: [],
    };
  }

  const topEvidence = evidenceList[0];

  // If match score is below minimum confidence threshold
  if (topEvidence.score < 0.2) {
    return {
      classification: 'insufficient-evidence',
      severity: null,
      reason: 'Available evidence has low relevance to verify statement.',
      evidence: [],
    };
  }

  const statementNums = extractNumbers(statementText);
  const evidenceNums = extractNumbers(topEvidence.text);

  // Check 1: Numeric / Date / Quantity Value Comparison
  if (statementNums.length > 0 && evidenceNums.length > 0) {
    // Check if statement numbers exist in evidence numbers
    const hasMismatch = statementNums.some(num => !evidenceNums.includes(num));

    if (hasMismatch && topEvidence.matchingTerms.length >= 2) {
      return {
        classification: 'contradicted',
        severity: evaluateSeverity('date-mismatch'),
        reason: `Factual value discrepancy: Statement asserts '${statementNums.join(', ')}' whereas trusted source indicates '${evidenceNums.join(', ')}'.`,
        evidence: evidenceList.slice(0, 3).map(ev => ({
          sourceId: ev.sourceId,
          sourceTitle: ev.sourceTitle,
          category: ev.category,
          sourceType: ev.sourceType,
          text: ev.text,
        })),
      };
    }
  }

  // Check 2: Definition & Factual Support Verification
  if (topEvidence.matchingTerms.length >= 2 || topEvidence.score >= 0.35) {
    return {
      classification: 'verified',
      severity: null,
      reason: 'The statement is supported by available trusted knowledge.',
      evidence: evidenceList.slice(0, 3).map(ev => ({
        sourceId: ev.sourceId,
        sourceTitle: ev.sourceTitle,
        category: ev.category,
        sourceType: ev.sourceType,
        text: ev.text,
      })),
    };
  }

  return {
    classification: 'insufficient-evidence',
    severity: null,
    reason: 'Available evidence is inconclusive.',
    evidence: [],
  };
}

module.exports = {
  compareStatementWithEvidence,
  extractNumbers,
};
