/**
 * TrustLens Computer Science Topic Detection Service
 * Identifies primary and related Computer Science topics for validated documents
 * using Task 1 domain constants and Task 2 text normalization.
 */

const {
  SUPPORTED_TOPICS,
  TOPIC_KEYWORDS,
} = require('../../constants/domainConstants');

const { normalizeText } = require('./domainValidationService');

/**
 * Weak generic terms that require additional technical context
 */
const WEAK_GENERIC_TERMS = new Set(['system', 'model', 'network', 'pattern', 'table', 'node', 'process']);

/**
 * Detects relevant Computer Science topics in extracted text
 * 
 * @param {string} rawText Extracted text content of the document
 * @returns {object} Structured topic detection result
 */
function detectTopics(rawText) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return {
      primaryTopic: 'General Computer Science',
      detectedTopics: [],
      topicScores: {},
      evidence: {},
    };
  }

  const normalized = normalizeText(rawText);
  const topicScoresRaw = {};
  const topicEvidenceMap = {};
  const topicUniqueMatchesMap = {};

  for (const topic of SUPPORTED_TOPICS) {
    const keywords = TOPIC_KEYWORDS[topic] || [];
    let weightedScore = 0;
    const matchedKeywords = new Set();

    for (const kw of keywords) {
      const normalizedKw = normalizeText(kw);
      if (!normalizedKw) continue;

      const regex = new RegExp(`\\b${normalizedKw}(?:s|es)?\\b`, 'gi');
      const matches = normalized.match(regex);

      if (matches && matches.length > 0) {
        matchedKeywords.add(kw);
        
        // Frequency cap: cap match multiplier to 3 to prevent single word repetition bias
        const matchFrequencyCount = Math.min(3, matches.length);
        const termWeight = WEAK_GENERIC_TERMS.has(normalizedKw)
          ? 0.5
          : (normalizedKw.includes(' ') ? 2.0 : 1.0);

        weightedScore += termWeight * (1 + 0.25 * (matchFrequencyCount - 1));
      }
    }

    const uniqueCount = matchedKeywords.size;
    topicUniqueMatchesMap[topic] = uniqueCount;
    topicEvidenceMap[topic] = Array.from(matchedKeywords);

    // Topic score combines unique keyword diversity and weighted evidence
    if (uniqueCount === 0) {
      topicScoresRaw[topic] = 0;
    } else {
      topicScoresRaw[topic] = parseFloat(((uniqueCount * 0.4) + (weightedScore * 0.6)).toFixed(2));
    }
  }

  // Calculate maximum score to normalize topic scores on scale 0.0 to 1.0
  const maxRawScore = Math.max(1, ...Object.values(topicScoresRaw));
  const topicScores = {};
  for (const topic of SUPPORTED_TOPICS) {
    topicScores[topic] = parseFloat((topicScoresRaw[topic] / maxRawScore).toFixed(2));
  }

  // Rank topics by raw score descending
  const sortedTopics = SUPPORTED_TOPICS
    .filter(t => topicScoresRaw[t] > 0)
    .sort((a, b) => topicScoresRaw[b] - topicScoresRaw[a]);

  // Topic thresholds
  // Requires minimum raw score >= 1.2 and at least 1 keyword match
  const eligibleTopics = sortedTopics.filter(topic => topicScoresRaw[topic] >= 1.2);

  if (eligibleTopics.length === 0) {
    return {
      primaryTopic: 'General Computer Science',
      detectedTopics: [],
      topicScores,
      evidence: topicEvidenceMap,
    };
  }

  const primaryTopic = eligibleTopics[0];
  const relatedTopics = eligibleTopics.slice(1).filter(t => {
    // Related topic must have raw score at least 40% of primary topic
    return topicScoresRaw[t] >= (topicScoresRaw[primaryTopic] * 0.4);
  });

  const detectedTopics = [primaryTopic, ...relatedTopics];

  return {
    primaryTopic,
    detectedTopics,
    topicScores,
    evidence: topicEvidenceMap,
  };
}

module.exports = {
  detectTopics,
};
