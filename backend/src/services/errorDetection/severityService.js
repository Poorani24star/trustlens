/**
 * Evaluates contradiction severity level (high, medium, low)
 */
function evaluateSeverity(conflictType) {
  switch (conflictType) {
    case 'numeric-mismatch':
    case 'date-mismatch':
    case 'definition-conflict':
      return 'high';
    case 'factual-inconsistency':
      return 'medium';
    case 'minor-inconsistency':
    default:
      return 'low';
  }
}

module.exports = {
  evaluateSeverity,
};
