const { comparePassages } = require('./textComparisonService');

/**
 * Aggregates passage matches and calculates matched content percentages for a document pair
 */
function aggregatePairMatches(pairId, docA, docB) {
  const matches = [];
  const matchedPassageIdsA = new Set();
  const matchedPassageIdsB = new Set();

  let exactMatchesCount = 0;
  let nearMatchesCount = 0;
  let matchCounter = 1;

  for (const passageA of docA.passages) {
    for (const passageB of docB.passages) {
      const result = comparePassages(passageA, passageB);

      if (result.matchType === 'exact-match' || result.matchType === 'near-match') {
        if (result.matchType === 'exact-match') exactMatchesCount++;
        if (result.matchType === 'near-match') nearMatchesCount++;

        matchedPassageIdsA.add(passageA.passageId);
        matchedPassageIdsB.add(passageB.passageId);

        matches.push({
          matchId: `${pairId}-match-${matchCounter++}`,
          matchType: result.matchType,
          similarity: result.similarity,
          documentA: {
            passageIndex: passageA.passageIndex,
            text: passageA.originalText,
          },
          documentB: {
            passageIndex: passageB.passageIndex,
            text: passageB.originalText,
          },
        });
      }
    }
  }

  // Calculate unique matched characters vs total characters
  let matchedCharsLengthA = 0;
  for (const passageA of docA.passages) {
    if (matchedPassageIdsA.has(passageA.passageId)) {
      matchedCharsLengthA += passageA.originalText.length;
    }
  }

  let matchedCharsLengthB = 0;
  for (const passageB of docB.passages) {
    if (matchedPassageIdsB.has(passageB.passageId)) {
      matchedCharsLengthB += passageB.originalText.length;
    }
  }

  const totalCharsA = docA.passages.reduce((sum, p) => sum + p.originalText.length, 0);
  const totalCharsB = docB.passages.reduce((sum, p) => sum + p.originalText.length, 0);

  const docAPercentage = totalCharsA > 0 ? Math.round((matchedCharsLengthA / totalCharsA) * 100) : 0;
  const docBPercentage = totalCharsB > 0 ? Math.round((matchedCharsLengthB / totalCharsB) * 100) : 0;
  const overallPercentage = Math.round((docAPercentage + docBPercentage) / 2);

  return {
    pairId,
    documentA: {
      documentId: docA.documentId,
      originalName: docA.originalName,
      matchedContentPercentage: Math.min(docAPercentage, 100),
    },
    documentB: {
      documentId: docB.documentId,
      originalName: docB.originalName,
      matchedContentPercentage: Math.min(docBPercentage, 100),
    },
    overallMatchedContentPercentage: Math.min(overallPercentage, 100),
    totalMatches: matches.length,
    exactMatches: exactMatchesCount,
    nearMatches: nearMatchesCount,
    matches,
  };
}

module.exports = {
  aggregatePairMatches,
};
