const { listKnowledgeSources } = require('../knowledgeService');
const { TRUSTED_KNOWLEDGE_SEED } = require('../../seeds/trustedKnowledgeSeedData');
const {
  SUPPORTED_DOMAIN,
  isSupportedTopic,
  RETRIEVAL_LIMITS,
  RETRIEVAL_PRIORITY_SCORES,
} = require('../../constants/domainConstants');

/**
 * Retrieves active trusted Computer Science knowledge relevant to a document's detected topics.
 *
 * @param {Object} topicInput - Structured topic detection input from Task 3
 * @param {string} [topicInput.domain] - Document domain (defaults to 'Computer Science')
 * @param {string} [topicInput.primaryTopic] - Primary detected topic string
 * @param {Array<string>} [topicInput.detectedTopics] - Array of detected topic strings
 * @param {Object} [options] - Optional override parameters (limits, etc.)
 * @returns {Promise<Object>} Structured retrieval result with entries and metadata
 */
async function retrieveRelevantKnowledge(topicInput = {}, options = {}) {
  const startTime = Date.now();
  const inputObj = topicInput || {};

  const domain = inputObj.domain || SUPPORTED_DOMAIN;
  const rawPrimary = inputObj.primaryTopic || null;
  const rawDetected = Array.isArray(inputObj.detectedTopics) ? inputObj.detectedTopics : [];

  // Filter valid Computer Science topics
  const primaryTopic = rawPrimary && isSupportedTopic(rawPrimary) ? rawPrimary : null;
  const detectedTopics = rawDetected.filter(t => isSupportedTopic(t));

  // If primaryTopic was valid but not included in detectedTopics, append it cleanly
  if (primaryTopic && !detectedTopics.some(t => t.toLowerCase() === primaryTopic.toLowerCase())) {
    detectedTopics.unshift(primaryTopic);
  }

  // Configured retrieval limits
  const maxPrimary = options.maxPrimaryTopicEntries || RETRIEVAL_LIMITS.MAX_PRIMARY_TOPIC_ENTRIES;
  const maxRelatedPerTopic = options.maxRelatedTopicEntriesPerTopic || RETRIEVAL_LIMITS.MAX_RELATED_TOPIC_ENTRIES_PER_TOPIC;
  const maxTotal = options.maxTotalRetrievedEntries || RETRIEVAL_LIMITS.MAX_TOTAL_RETRIEVED_ENTRIES;

  // Domain gate check: Return safe empty result if domain is not supported
  if (domain !== SUPPORTED_DOMAIN) {
    return {
      success: true,
      domain,
      primaryTopic: null,
      retrievedTopics: [],
      entries: [],
      metadata: {
        totalRetrieved: 0,
        primaryTopicEntries: 0,
        relatedTopicEntries: 0,
        retrievedSourceIds: [],
        retrievedTopicCounts: {},
        retrievalDurationMs: Date.now() - startTime,
      },
    };
  }

  // Fallback Case A: No detected topics / no primary topic -> Safe empty result
  if (!primaryTopic && detectedTopics.length === 0) {
    return {
      success: true,
      domain: SUPPORTED_DOMAIN,
      primaryTopic: null,
      retrievedTopics: [],
      entries: [],
      metadata: {
        totalRetrieved: 0,
        primaryTopicEntries: 0,
        relatedTopicEntries: 0,
        retrievedSourceIds: [],
        retrievedTopicCounts: {},
        retrievalDurationMs: Date.now() - startTime,
      },
    };
  }

  try {
    // Step 4 & 5: Retrieve ACTIVE knowledge sources for Computer Science domain
    let activeSources = [];
    try {
      activeSources = await listKnowledgeSources({ status: 'active' });
    } catch (dbErr) {
      console.warn('[KnowledgeRetrievalService] Firestore query notice (using curated fallback knowledge):', dbErr.message);
    }

    if (!activeSources || activeSources.length === 0) {
      activeSources = TRUSTED_KNOWLEDGE_SEED || [];
    }

    // Filter strictly for ACTIVE sources with matching domain
    const validActiveSources = activeSources.filter(s => {
      const srcStatus = (s.status || 'active').toLowerCase();
      const srcDomain = s.domain || SUPPORTED_DOMAIN;
      return srcStatus === 'active' && srcDomain === SUPPORTED_DOMAIN;
    });

    const primaryCandidateEntries = [];
    const relatedCandidateEntries = [];

    for (const src of validActiveSources) {
      const srcTopics = Array.isArray(src.topics) && src.topics.length > 0
        ? src.topics
        : [src.category || SUPPORTED_DOMAIN];

      // Check primary topic match
      const isPrimaryMatch = primaryTopic && srcTopics.some(t => t.toLowerCase() === primaryTopic.toLowerCase());

      // Check related topics match
      const matchedDetectedTopics = detectedTopics.filter(dt =>
        srcTopics.some(st => st.toLowerCase() === dt.toLowerCase())
      );

      if (!isPrimaryMatch && matchedDetectedTopics.length === 0) {
        continue; // No topic overlap
      }

      // Calculate Priority Score (Step 10)
      let baseScore = isPrimaryMatch
        ? RETRIEVAL_PRIORITY_SCORES.PRIMARY_TOPIC_MATCH
        : RETRIEVAL_PRIORITY_SCORES.RELATED_TOPIC_MATCH;
      
      const extraMatchBonus = Math.max(0, matchedDetectedTopics.length - 1) * RETRIEVAL_PRIORITY_SCORES.MULTI_TOPIC_BONUS;
      const totalPriority = baseScore + extraMatchBonus;

      const retrievalReason = isPrimaryMatch ? 'primary_topic' : 'related_topic';

      const entry = {
        id: src.id || src.sourceId,
        sourceId: src.id || src.sourceId,
        sourceTitle: src.title || src.name || 'Knowledge Source',
        title: src.title || src.name || 'Knowledge Source',
        domain: src.domain || SUPPORTED_DOMAIN,
        content: src.extractedText || src.text || src.description || '',
        topics: srcTopics,
        sourceType: src.sourceType || 'Technical Documentation',
        sourceOrganization: src.sourceOrganization || null,
        sourceUrl: src.sourceUrl || null,
        status: src.status || 'active',
        retrievalReason,
        priority: totalPriority,
        createdAt: src.createdAt ? new Date(src.createdAt).getTime() : 0,
      };

      if (isPrimaryMatch) {
        primaryCandidateEntries.push(entry);
      } else {
        relatedCandidateEntries.push(entry);
      }
    }

    // Step 6 & 12: Primary Topic Prioritization & Limits
    primaryCandidateEntries.sort((a, b) => b.priority - a.priority || b.createdAt - a.createdAt);
    const limitedPrimaryEntries = primaryCandidateEntries.slice(0, maxPrimary);

    // Step 7: Related Topic Retrieval & Per-Topic Limits
    relatedCandidateEntries.sort((a, b) => b.priority - a.priority || b.createdAt - a.createdAt);

    // Deduplicate and group related entries
    const selectedRelatedEntries = [];
    const relatedCountByTopic = {};

    for (const relEntry of relatedCandidateEntries) {
      const mainTopic = relEntry.topics[0] || 'General';
      relatedCountByTopic[mainTopic] = relatedCountByTopic[mainTopic] || 0;

      if (relatedCountByTopic[mainTopic] < maxRelatedPerTopic) {
        selectedRelatedEntries.push(relEntry);
        relatedCountByTopic[mainTopic]++;
      }
    }

    // Step 11: Deduplicate combined set using sourceId
    const combinedMap = new Map();

    for (const e of limitedPrimaryEntries) {
      combinedMap.set(e.id, e);
    }
    for (const e of selectedRelatedEntries) {
      if (!combinedMap.has(e.id)) {
        combinedMap.set(e.id, e);
      }
    }

    // Final total retrieval limit
    const finalEntries = Array.from(combinedMap.values())
      .sort((a, b) => b.priority - a.priority || b.createdAt - a.createdAt)
      .slice(0, maxTotal);

    // Build topic counts & source IDs for metadata
    const topicCounts = {};
    const primaryCount = finalEntries.filter(e => e.retrievalReason === 'primary_topic').length;
    const relatedCount = finalEntries.filter(e => e.retrievalReason === 'related_topic').length;

    finalEntries.forEach(e => {
      e.topics.forEach(t => {
        topicCounts[t] = (topicCounts[t] || 0) + 1;
      });
    });

    return {
      success: true,
      domain: SUPPORTED_DOMAIN,
      primaryTopic,
      retrievedTopics: detectedTopics,
      entries: finalEntries,
      metadata: {
        totalRetrieved: finalEntries.length,
        primaryTopicEntries: primaryCount,
        relatedTopicEntries: relatedCount,
        retrievedSourceIds: finalEntries.map(e => e.id),
        retrievedTopicCounts: topicCounts,
        retrievalDurationMs: Date.now() - startTime,
      },
    };

  } catch (err) {
    console.error('[KnowledgeRetrievalService] Error during retrieval:', err.message);
    // Safe error handling fallback - return empty result with error metadata
    return {
      success: false,
      error: 'Unable to retrieve trusted knowledge. Please try again.',
      domain: SUPPORTED_DOMAIN,
      primaryTopic,
      retrievedTopics: detectedTopics,
      entries: [],
      metadata: {
        totalRetrieved: 0,
        primaryTopicEntries: 0,
        relatedTopicEntries: 0,
        retrievedSourceIds: [],
        retrievedTopicCounts: {},
        retrievalDurationMs: Date.now() - startTime,
      },
    };
  }
}

module.exports = {
  retrieveRelevantKnowledge,
};
