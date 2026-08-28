/**
 * Configuration parameters for Copied Content Detection algorithm pipeline
 */
module.exports = {
  // Document level safeguards
  MIN_DOCUMENTS: 2,
  MIN_REQUIRED_DOCUMENTS: 2, // Backwards compatibility alias
  MAX_SUPPORTED_DOCUMENTS: 10,

  // Passage segmentation parameters
  MIN_PASSAGE_LENGTH: 15,
  MIN_PASSAGE_CHAR_LENGTH: 15, // Backwards compatibility alias

  // Shingling configuration
  SHINGLE_SIZE: 5,

  // Similarity Classification Thresholds
  EXACT_MATCH_THRESHOLD: 1.0,
  HIGH_SIMILARITY_THRESHOLD: 0.80,
  MEDIUM_SIMILARITY_THRESHOLD: 0.60,
  LOW_SIMILARITY_THRESHOLD: 0.30,
  NEAR_MATCH_THRESHOLD: 0.60, // Backwards compatibility alias

  // Score weighting
  JACCARD_WEIGHT: 0.60,
  LEVENSHTEIN_WEIGHT: 0.40,

  // Performance safeguards for Levenshtein calculations
  MAX_LEVENSHTEIN_LENGTH: 1000,
  CANDIDATE_TOKEN_OVERLAP_THRESHOLD: 0.20,
  CANDIDATE_JACCARD_THRESHOLD: 0.15,

  // Aggregation parameters
  MATCHED_CONTENT_MIN_LENGTH: 10,
};
