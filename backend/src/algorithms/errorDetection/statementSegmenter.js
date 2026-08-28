const { extractAndPrepareStatements } = require('../../services/errorDetection/statementExtractionService');

/**
 * Splits document text into clean, individual statements/sentences
 * @param {string} text - Raw document text
 * @returns {Array<{statementId: string, index: number, originalStatement: string, statement: string, normalizedStatement: string}>}
 */
function segmentText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const extractionResult = extractAndPrepareStatements(text);
  const readyList = extractionResult.readyStatements || [];

  return readyList.map((stmt, idx) => {
    const rawStatement = stmt.text || stmt.originalStatement || '';
    const normalized = rawStatement.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    return {
      statementId: stmt.statementId || `statement-${idx + 1}`,
      index: idx + 1,
      originalStatement: rawStatement,
      statement: rawStatement, // Backwards compatibility for existing UI
      normalizedStatement: normalized,
    };
  });
}

module.exports = {
  segmentText,
};
