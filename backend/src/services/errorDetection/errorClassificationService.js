/**
 * Factual Error Classification Service (Task 10)
 * 
 * Implements an explainable factual error classification layer that analyzes statement-to-knowledge
 * comparison outputs from Task 9.
 * 
 * Determines factual status using:
 * 1. Statement text & best matching trusted knowledge content
 * 2. Cosine similarity score and threshold
 * 3. Polarity and explicit negation detection
 * 4. Factual numerical & unit comparisons
 * 5. Technical property reversals (e.g. connection-oriented vs connectionless, volatile vs non-volatile)
 * 6. Misleading absolute claims (e.g. "always", "guarantees")
 * 7. Availability of trusted knowledge
 * 
 * CRITICAL RULE: Cosine similarity score ALONE does not determine correctness.
 * High similarity + negation or property reversal MUST be classified as INCORRECT.
 */

const { FACTUAL_CLASSIFICATION, MIN_SIMILARITY_THRESHOLD, COMPARISON_STATUS } = require('../../constants/domainConstants');

/**
 * Absolute/overgeneralizing terms that suggest a statement may be MISLEADING if not qualified in trusted knowledge
 */
const ABSOLUTE_TERMS = ['always', 'guarantees', 'guaranteed', 'every situation', 'every case', 'in all cases', 'completely', '100%', 'without exception'];

/**
 * Known technical property pairs for CS domain reversal detection
 */
const CS_PROPERTY_PAIRS = [
  { termA: 'connection-oriented', termB: 'connectionless', property: 'connection type' },
  { termA: 'volatile', termB: 'non-volatile', property: 'memory volatility' },
  { termA: 'stateful', termB: 'stateless', property: 'protocol state' },
  { termA: 'synchronous', termB: 'asynchronous', property: 'synchronization mode' },
  { termA: 'symmetric', termB: 'asymmetric', property: 'cryptographic key type' },
  { termA: 'lossy', termB: 'lossless', property: 'compression type' },
];

/**
 * Extracts explicit numbers with optional units from a text string
 * Examples: "32-bit" -> { value: 32, unit: "bit" }, "64-bit" -> { value: 64, unit: "bit" }
 */
function extractNumericalValuesWithUnits(text) {
  if (!text || typeof text !== 'string') return [];
  const results = [];

  // Match numbers with hyphens/units or standalone numbers
  const numRegex = /\b(\d+(\.\d+)?)\s*(-|\s)?\s*(bit|bits|byte|bytes|mb|gb|tb|hz|ghz|mhz|ms|s|sec|seconds|layers|port|ports|%)?\b/gi;
  let match;

  while ((match = numRegex.exec(text)) !== null) {
    const rawVal = parseFloat(match[1]);
    const unit = match[4] ? match[4].toLowerCase().replace(/s$/, '') : '';
    if (!isNaN(rawVal)) {
      results.push({ value: rawVal, unit, rawText: match[0] });
    }
  }

  return results;
}

/**
 * Detects presence of explicit negation in a sentence
 */
function isNegated(text) {
  if (!text || typeof text !== 'string') return false;
  return /\b(not|no|never|neither|nor|without|cannot|isn't|is not|are not|doesn't|does not|don't)\b/i.test(text);
}

/**
 * Checks for technical property reversals between statement and trusted knowledge
 */
function detectPropertyReversal(stmtText, knowledgeText) {
  const stmtLower = (stmtText || '').toLowerCase();
  const kLower = (knowledgeText || '').toLowerCase();

  for (const pair of CS_PROPERTY_PAIRS) {
    const stmtHasA = stmtLower.includes(pair.termA);
    const stmtHasB = stmtLower.includes(pair.termB);
    const kHasA = kLower.includes(pair.termA);
    const kHasB = kLower.includes(pair.termB);

    if (stmtHasA && kHasB) {
      return { reversalFound: true, stmtTerm: pair.termA, kTerm: pair.termB, property: pair.property };
    }
    if (stmtHasB && kHasA) {
      return { reversalFound: true, stmtTerm: pair.termB, kTerm: pair.termA, property: pair.property };
    }
  }

  return { reversalFound: false };
}

/**
 * Compares numerical facts between statement and trusted knowledge
 */
function checkNumericalContradiction(stmtText, knowledgeText) {
  const stmtNums = extractNumericalValuesWithUnits(stmtText);
  const kNums = extractNumericalValuesWithUnits(knowledgeText);

  if (stmtNums.length === 0 || kNums.length === 0) {
    return { hasMismatch: false };
  }

  for (const sNum of stmtNums) {
    for (const kNum of kNums) {
      // Compare if units match (e.g. bit vs bit) or if both are plain numbers in short context
      const unitsMatch = (sNum.unit && kNum.unit && sNum.unit === kNum.unit);
      if (unitsMatch && sNum.value !== kNum.value) {
        return {
          hasMismatch: true,
          stmtValue: `${sNum.value} ${sNum.unit}`,
          kValue: `${kNum.value} ${kNum.unit}`,
        };
      }
    }
  }

  return { hasMismatch: false };
}

/**
 * Checks if statement overgeneralizes using absolute language
 */
function detectMisleadingAbsoluteClaim(stmtText, knowledgeText) {
  const stmtLower = (stmtText || '').toLowerCase();
  const kLower = (knowledgeText || '').toLowerCase();

  for (const absTerm of ABSOLUTE_TERMS) {
    if (stmtLower.includes(absTerm)) {
      // Check if trusted knowledge does NOT use that absolute term (i.e. trusted is qualified)
      if (!kLower.includes(absTerm)) {
        return { isMisleading: true, absoluteTerm: absTerm };
      }
    }
  }

  return { isMisleading: false };
}

/**
 * Classifies a single statement based on Task 9 comparison output
 * 
 * @param {Object} item - Single comparison result object from Task 9
 * @returns {Object} Structured classification result
 */
function classifySingleStatement(item) {
  if (!item || typeof item !== 'object') {
    return {
      statementId: 'unknown',
      classification: FACTUAL_CLASSIFICATION.UNSUPPORTED,
      classificationReason: 'Invalid or missing comparison data.',
      comparison: { similarity: 0, threshold: MIN_SIMILARITY_THRESHOLD, comparisonStatus: COMPARISON_STATUS.NO_SUFFICIENT_MATCH },
      evidence: null,
    };
  }

  const statementId = item.statementId || item.id || 'stmt-unknown';
  const documentId = item.documentId || null;
  const documentName = item.documentName || null;
  const statementText = item.statementText || item.text || '';
  const topic = item.topic || item.primaryTopic || null;
  const compStatus = item.comparisonStatus || COMPARISON_STATUS.NO_SUFFICIENT_MATCH;
  const bestMatch = item.bestMatch || null;
  const threshold = (typeof item.threshold === 'number' && !isNaN(item.threshold)) ? item.threshold : MIN_SIMILARITY_THRESHOLD;
  const similarity = (bestMatch && typeof bestMatch.similarity === 'number' && !isNaN(bestMatch.similarity)) ? bestMatch.similarity : 0.0;

  const baseResult = {
    statementId,
    documentId,
    documentName,
    statementText,
    topic,
    comparison: {
      similarity,
      threshold,
      comparisonStatus: compStatus,
    },
    evidence: bestMatch ? {
      knowledgeId: bestMatch.knowledgeId || bestMatch.id,
      sourceId: bestMatch.sourceId || bestMatch.knowledgeId,
      title: bestMatch.title || 'Trusted Source',
      content: bestMatch.content || '',
      sharedTerms: bestMatch.sharedTerms || [],
    } : null,
  };

  // ---------------------------------------------------------
  // DECISION STEP 1: NO KNOWLEDGE AVAILABLE
  // ---------------------------------------------------------
  if (compStatus === COMPARISON_STATUS.NO_KNOWLEDGE_AVAILABLE || !bestMatch) {
    return {
      ...baseResult,
      classification: FACTUAL_CLASSIFICATION.NO_KNOWLEDGE_AVAILABLE,
      classificationReason: 'No relevant trusted knowledge is currently available for this statement topic.',
    };
  }

  const kContent = bestMatch.content || bestMatch.title || '';

  // ---------------------------------------------------------
  // DECISION STEP 2: CHECK FOR CONTRADICTION (Polarity, Negation, Property Reversal, Numerical Mismatch)
  // ---------------------------------------------------------

  // Check 2a: Negation & Polarity Inversion
  const stmtIsNegated = isNegated(statementText);
  const kIsNegated = isNegated(kContent);

  if (stmtIsNegated !== kIsNegated) {
    return {
      ...baseResult,
      classification: FACTUAL_CLASSIFICATION.INCORRECT,
      classificationReason: `Statement contradicts trusted knowledge: the submitted statement contains a negation reversing the claim, whereas trusted evidence specifies '${kContent.substring(0, 150)}...'.`,
    };
  }

  // Check 2b: Technical Property Reversal
  const propCheck = detectPropertyReversal(statementText, kContent);
  if (propCheck.reversalFound) {
    return {
      ...baseResult,
      classification: FACTUAL_CLASSIFICATION.INCORRECT,
      classificationReason: `Statement contradicts trusted knowledge: describes ${propCheck.stmtTerm} for ${propCheck.property}, while trusted knowledge specifies ${propCheck.kTerm}.`,
    };
  }

  // Check 2c: Numerical & Unit Contradiction
  const numCheck = checkNumericalContradiction(statementText, kContent);
  if (numCheck.hasMismatch) {
    return {
      ...baseResult,
      classification: FACTUAL_CLASSIFICATION.INCORRECT,
      classificationReason: `Statement contains a numerical factual contradiction: submitted value is ${numCheck.stmtValue}, whereas trusted knowledge specifies ${numCheck.kValue}.`,
    };
  }

  // ---------------------------------------------------------
  // DECISION STEP 3: CHECK LOW SIMILARITY MATCH (UNSUPPORTED)
  // ---------------------------------------------------------
  if (compStatus === COMPARISON_STATUS.NO_SUFFICIENT_MATCH || similarity < threshold) {
    return {
      ...baseResult,
      classification: FACTUAL_CLASSIFICATION.UNSUPPORTED,
      classificationReason: 'No sufficiently strong trusted evidence was found to verify this specific factual claim.',
    };
  }

  // ---------------------------------------------------------
  // DECISION STEP 4: CHECK MISLEADING ABSOLUTE CLAIMS
  // ---------------------------------------------------------
  const misleadingCheck = detectMisleadingAbsoluteClaim(statementText, kContent);
  if (misleadingCheck.isMisleading) {
    return {
      ...baseResult,
      classification: FACTUAL_CLASSIFICATION.MISLEADING,
      classificationReason: `Statement is related to trusted knowledge but overgeneralizes or makes an absolute claim ('${misleadingCheck.absoluteTerm}') that exceeds available evidence.`,
    };
  }

  // ---------------------------------------------------------
  // DECISION STEP 5: SUPPORTED CLASSIFICATION
  // ---------------------------------------------------------
  return {
    ...baseResult,
    classification: FACTUAL_CLASSIFICATION.SUPPORTED,
    classificationReason: 'Statement is consistent with and supported by retrieved trusted knowledge.',
  };
}

/**
 * Classifies an array of Task 9 comparison result objects
 * 
 * @param {Object|Array} comparisonOutput - Output from Task 9 statementComparisonService
 * @returns {Object} Complete classification output with document-level summary counts
 */
function classifyStatements(comparisonOutput) {
  if (!comparisonOutput) {
    return {
      success: false,
      message: 'No comparison output provided.',
      summary: { supported: 0, incorrect: 0, misleading: 0, unsupported: 0, noKnowledgeAvailable: 0 },
      results: [],
    };
  }

  const resultsList = Array.isArray(comparisonOutput)
    ? comparisonOutput
    : (comparisonOutput.results || []);

  const classifiedResults = resultsList.map((item) => classifySingleStatement(item));

  const summaryCounts = {
    supported: 0,
    incorrect: 0,
    misleading: 0,
    unsupported: 0,
    noKnowledgeAvailable: 0,
  };

  for (const item of classifiedResults) {
    switch (item.classification) {
      case FACTUAL_CLASSIFICATION.SUPPORTED:
        summaryCounts.supported++;
        break;
      case FACTUAL_CLASSIFICATION.INCORRECT:
        summaryCounts.incorrect++;
        break;
      case FACTUAL_CLASSIFICATION.MISLEADING:
        summaryCounts.misleading++;
        break;
      case FACTUAL_CLASSIFICATION.UNSUPPORTED:
        summaryCounts.unsupported++;
        break;
      case FACTUAL_CLASSIFICATION.NO_KNOWLEDGE_AVAILABLE:
        summaryCounts.noKnowledgeAvailable++;
        break;
      default:
        summaryCounts.unsupported++;
        break;
    }
  }

  return {
    success: true,
    totalClassified: classifiedResults.length,
    summary: summaryCounts,
    results: classifiedResults,
  };
}

module.exports = {
  classifyStatementComparison: classifySingleStatement,
  classifyStatements,
  isNegated,
  detectPropertyReversal,
  checkNumericalContradiction,
  detectMisleadingAbsoluteClaim,
  extractNumericalValuesWithUnits,
};
