/**
 * TrustLens Computer Science Domain Validation Service
 * Validates whether an extracted document belongs to the Computer Science domain
 * using the centralized Task 1 domain constants.
 */

const {
  SUPPORTED_DOMAIN,
  SUPPORTED_TOPICS,
  TOPIC_KEYWORDS,
} = require('../../constants/domainConstants');

/**
 * Highly ambiguous generic terms that appear in non-CS contexts
 */
const WEAK_GENERIC_TERMS = new Set(['system', 'model', 'network', 'pattern', 'table', 'node', 'process']);

/**
 * Normalizes document text for accurate keyword matching
 */
function normalizeText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .toLowerCase()
    .replace(/[/\\._-]/g, ' ') // Preserve slash/dot/hyphen separated terms as spaces
    .replace(/[^\w\s]/g, '')   // Remove other punctuation
    .replace(/\s+/g, ' ')       // Normalize spaces
    .trim();
}

/**
 * Validates if the extracted text belongs to the Computer Science domain
 * 
 * @param {string} rawText Extracted text content of the document
 * @returns {object} Structured domain validation result
 */
function validateDomain(rawText) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return {
      supported: false,
      isContentError: true,
      detectedDomain: null,
      confidence: 0,
      evidence: { totalMatches: 0, matchedTopics: [], matchedKeywords: [] },
      message: 'Unable to extract sufficient text from this document for analysis.',
    };
  }

  const trimmedText = rawText.trim();
  if (trimmedText.length < 30) {
    return {
      supported: false,
      isContentError: true,
      detectedDomain: null,
      confidence: 0,
      evidence: { totalMatches: 0, matchedTopics: [], matchedKeywords: [] },
      message: 'The document does not contain enough readable content for domain analysis.',
    };
  }

  const normalized = normalizeText(rawText);
  const matchedTopicsSet = new Set();
  const matchedKeywordsSet = new Set();
  let totalTechnicalScore = 0;
  let genericMatchesOnlyCount = 0;

  for (const topic of SUPPORTED_TOPICS) {
    const keywords = TOPIC_KEYWORDS[topic] || [];
    for (const kw of keywords) {
      const normalizedKw = normalizeText(kw);
      if (!normalizedKw) continue;

      // Word boundary regex with optional plural suffix for robust matching
      const regex = new RegExp(`\\b${normalizedKw}(?:s|es)?\\b`, 'i');
      if (regex.test(normalized)) {
        matchedKeywordsSet.add(kw);
        matchedTopicsSet.add(topic);

        if (WEAK_GENERIC_TERMS.has(normalizedKw)) {
          genericMatchesOnlyCount++;
          totalTechnicalScore += 0.5; // Lower weight for ambiguous terms
        } else if (normalizedKw.includes(' ')) {
          totalTechnicalScore += 2.0; // Higher weight for multi-word technical phrases
        } else {
          totalTechnicalScore += 1.0; // Standard single-word technical terms
        }
      }
    }
  }

  const totalMatches = matchedKeywordsSet.size;
  const matchedTopics = Array.from(matchedTopicsSet);
  const matchedKeywords = Array.from(matchedKeywordsSet);

  // Validation threshold: Requires technical evidence score >= 1.5 OR at least 2 distinct technical matches
  // Weak generic words alone (e.g. just "system" or just "network") do NOT pass.
  const isSupported = (totalTechnicalScore >= 1.5 && totalMatches >= 1) || (totalMatches >= 2 && genericMatchesOnlyCount < totalMatches);

  const confidence = isSupported
    ? Math.min(0.99, parseFloat((0.65 + (totalTechnicalScore * 0.05)).toFixed(2)))
    : Math.max(0.05, parseFloat((totalTechnicalScore * 0.1).toFixed(2)));

  if (isSupported) {
    return {
      supported: true,
      detectedDomain: SUPPORTED_DOMAIN,
      confidence,
      evidence: {
        totalMatches,
        technicalScore: totalTechnicalScore,
        matchedTopics,
        matchedKeywords,
      },
      message: 'Document successfully validated for Computer Science domain.',
    };
  }

  return {
    supported: false,
    isContentError: false,
    detectedDomain: null,
    confidence,
    evidence: {
      totalMatches,
      technicalScore: totalTechnicalScore,
      matchedTopics,
      matchedKeywords,
    },
    message: 'TrustLens Error Detection currently supports Computer Science documents only. Please upload a document related to a supported Computer Science topic.',
  };
}

module.exports = {
  validateDomain,
  normalizeText,
};
