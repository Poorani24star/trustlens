/**
 * Splits extracted document text into individual sentences/statements
 */
function splitIntoStatements(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Split on sentence boundaries (. ! ?) followed by space, or line breaks
  const rawSentences = text.split(/(?<=[.!?])\s+|\n+/);
  const statements = [];
  let index = 1;

  for (const raw of rawSentences) {
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      statements.push({
        statementId: `statement-${index}`,
        index,
        text: trimmed,
      });
      index++;
    }
  }

  return statements;
}

module.exports = {
  splitIntoStatements,
};
