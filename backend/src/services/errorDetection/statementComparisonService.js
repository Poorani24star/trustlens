/**
 * Statement-to-Knowledge Comparison Service (Task 9)
 * 
 * Implements a deterministic, explainable, local statement-to-knowledge comparison algorithm
 * using TF-IDF vectorization and Cosine Similarity to find the most textually relevant trusted knowledge
 * entry for each extracted document statement.
 * 
 * IMPORTANT:
 * Textual similarity does NOT imply factual correctness.
 * High similarity means strong textual match; low similarity means no sufficiently similar knowledge entry was found.
 * Statements are NOT classified as correct, incorrect, misleading, or unsupported in this task (that is Task 10).
 */

const { MIN_SIMILARITY_THRESHOLD, COMPARISON_STATUS } = require('../../constants/domainConstants');

/**
 * List of standard English stop words to filter out while preserving technical terms & negation markers
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'of', 'to', 'for', 'with', 'by',
  'as', 'that', 'this', 'it', 'its', 'from', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 'if', 'than', 'so',
  'such', 'both', 'each', 'all', 'any', 'most', 'other', 'some', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
  'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'other', 'some', 'such'
]);

/**
 * Computer Science protected terms that must not be stripped or split
 */
const PROTECTED_CS_TERMS = [
  'tcp/ip', 'http', 'https', 'sql', 'nosql', 'dbms', 'acid', 'iaas', 'paas', 'saas',
  'cpu', 'gpu', 'ram', 'api', 'dns', 'os', 'vm', 'udp', 'ip', 'lan', 'wan', 'mac',
  'ssl', 'tls', 'rest', 'soap', 'json', 'xml', 'html', 'css', 'dom', 'gui', 'cli'
];

/**
 * Tokenizes text into normalized lowercased terms, preserving protected CS terms and negation tokens
 * 
 * @param {string} text - Raw text string
 * @returns {string[]} Array of normalized term tokens
 */
function tokenizeText(text) {
  if (!text || typeof text !== 'string') return [];

  // Protect technical terms with slashes (e.g. TCP/IP -> tcp___slash___ip)
  let protectedText = text.toLowerCase();
  protectedText = protectedText.replace(/\btcp\/ip\b/g, 'tcp___slash___ip');
  protectedText = protectedText.replace(/\bi\/o\b/g, 'i___slash___o');
  protectedText = protectedText.replace(/\bci\/cd\b/g, 'ci___slash___cd');
  protectedText = protectedText.replace(/\ba\/b\b/g, 'a___slash___b');

  // Strip punctuation except internal hyphens and digits
  const cleaned = protectedText.replace(/[^\w\s-]/g, ' ');
  const rawWords = cleaned.split(/\s+/).filter(Boolean);

  const tokens = [];
  for (const word of rawWords) {
    const unmappedWord = word.replace(/___slash___/g, '/');

    // Retain protected terms, numbers, technical words, and non-stop words
    if (
      PROTECTED_CS_TERMS.includes(unmappedWord) ||
      /\d/.test(unmappedWord) ||
      !STOP_WORDS.has(unmappedWord)
    ) {
      if (unmappedWord.length > 1 || /\d/.test(unmappedWord) || unmappedWord === 'a') {
        tokens.push(unmappedWord);
        // Expand compound hyphenated words (e.g. connection-oriented -> connection, oriented)
        if (unmappedWord.includes('-') && !PROTECTED_CS_TERMS.includes(unmappedWord)) {
          const parts = unmappedWord.split('-');
          for (const p of parts) {
            if (p.length > 2 && !STOP_WORDS.has(p)) {
              tokens.push(p);
            }
          }
        }
      }
    }
  }

  return tokens;
}

/**
 * Calculates Term Frequency (TF) for a tokenized text document
 * Formulation: TF(t, d) = count(t, d) / total_terms(d)
 * 
 * @param {string[]} tokens - Token array for document d
 * @returns {Map<string, number>} Map of term -> normalized TF score
 */
function calculateTF(tokens) {
  const tfMap = new Map();
  if (!tokens || tokens.length === 0) return tfMap;

  const totalTerms = tokens.length;
  for (const token of tokens) {
    tfMap.set(token, (tfMap.get(token) || 0) + 1);
  }

  for (const [term, count] of tfMap.entries()) {
    tfMap.set(term, count / totalTerms);
  }

  return tfMap;
}

/**
 * Calculates Inverse Document Frequency (IDF) over a comparison corpus
 * Formulation: IDF(t) = ln((N + 1) / (DF(t) + 1)) + 1
 * 
 * @param {Array<string[]>} corpusTokens - Array of token arrays for each document in corpus
 * @returns {Map<string, number>} Map of term -> IDF score
 */
function calculateIDF(corpusTokens) {
  const idfMap = new Map();
  const N = corpusTokens.length;
  if (N === 0) return idfMap;

  // Calculate Document Frequency (DF) for each term
  const dfMap = new Map();
  for (const tokens of corpusTokens) {
    const uniqueTermsInDoc = new Set(tokens);
    for (const term of uniqueTermsInDoc) {
      dfMap.set(term, (dfMap.get(term) || 0) + 1);
    }
  }

  // Smooth IDF formula to prevent log(0) and negative values
  for (const [term, df] of dfMap.entries()) {
    const idf = Math.log((N + 1) / (df + 1)) + 1;
    idfMap.set(term, idf);
  }

  return idfMap;
}

/**
 * Calculates Cosine Similarity between two TF-IDF vector maps
 * Formulation: CosineSim(A, B) = (A · B) / (||A|| × ||B||)
 * 
 * @param {Map<string, number>} vectorA - Statement TF-IDF map
 * @param {Map<string, number>} vectorB - Knowledge entry TF-IDF map
 * @returns {number} Cosine similarity float in range [0.0, 1.0]
 */
function calculateCosineSimilarity(vectorA, vectorB) {
  if (!vectorA || !vectorB || vectorA.size === 0 || vectorB.size === 0) {
    return 0.0;
  }

  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;

  for (const val of vectorA.values()) {
    normA += val * val;
  }

  for (const [term, valB] of vectorB.entries()) {
    normB += valB * valB;
    if (vectorA.has(term)) {
      const valA = vectorA.get(term);
      dotProduct += valA * valB;
    }
  }

  const magA = Math.sqrt(normA);
  const magB = Math.sqrt(normB);

  if (magA === 0 || magB === 0) {
    return 0.0;
  }

  const similarity = dotProduct / (magA * magB);

  // Guard against floating point inaccuracies bound overflow / NaN
  if (isNaN(similarity) || !isFinite(similarity)) return 0.0;
  return Math.min(1.0, Math.max(0.0, similarity));
}

/**
 * Detects presence of obvious negation markers for metadata explanation
 */
function detectNegation(text) {
  if (!text || typeof text !== 'string') return false;
  return /\b(not|no|never|neither|nor|without|cannot|n't)\b/i.test(text);
}

/**
 * Detects presence of numeric values for metadata explanation
 */
function detectNumericValues(text) {
  if (!text || typeof text !== 'string') return false;
  return /\b\d+(\.\d+)?\b/.test(text);
}

/**
 * Compares extracted statements against relevant trusted knowledge entries
 * 
 * @param {Array<Object>} statements - Array of extracted statements from Task 8
 * @param {Array<Object>} knowledgeEntries - Array of relevant knowledge entries from Task 7
 * @param {Object} [options] - Configurable options (e.g. custom threshold)
 * @returns {Object} Structured comparison output
 */
function compareStatementsToKnowledge(statements = [], knowledgeEntries = [], options = {}) {
  const threshold = (typeof options.threshold === 'number') ? options.threshold : MIN_SIMILARITY_THRESHOLD;

  if (!Array.isArray(statements) || statements.length === 0) {
    return {
      success: true,
      comparisonStatus: COMPARISON_STATUS.NO_STATEMENTS,
      totalStatementsAnalyzed: 0,
      matchedStatementsCount: 0,
      unmatchedStatementsCount: 0,
      threshold,
      results: [],
    };
  }

  if (!Array.isArray(knowledgeEntries) || knowledgeEntries.length === 0) {
    const emptyResults = statements.map((stmt) => ({
      statementId: stmt.id || stmt.statementId,
      documentId: stmt.documentId || null,
      documentName: stmt.documentName || null,
      statementText: stmt.text || stmt.originalStatement || '',
      topic: stmt.primaryTopic || (stmt.detectedTopics ? stmt.detectedTopics[0] : null),
      comparisonStatus: COMPARISON_STATUS.NO_KNOWLEDGE_AVAILABLE,
      bestMatch: null,
      alternatives: [],
      threshold,
      hasNegationToken: detectNegation(stmt.text),
      hasNumericValues: detectNumericValues(stmt.text),
    }));

    return {
      success: true,
      comparisonStatus: COMPARISON_STATUS.NO_KNOWLEDGE_AVAILABLE,
      totalStatementsAnalyzed: statements.length,
      matchedStatementsCount: 0,
      unmatchedStatementsCount: statements.length,
      threshold,
      results: emptyResults,
    };
  }

  // Pre-tokenize knowledge entries
  const tokenizedKnowledge = knowledgeEntries.map((kEntry) => {
    const kText = `${kEntry.title || ''} ${kEntry.content || kEntry.extractedText || ''}`;
    return {
      entry: kEntry,
      tokens: tokenizeText(kText),
    };
  });

  // Pre-tokenize statements
  const tokenizedStatements = statements.map((stmt) => {
    return {
      statement: stmt,
      tokens: tokenizeText(stmt.text || stmt.originalStatement || ''),
    };
  });

  // Construct comparison corpus for IDF calculation
  const corpusTokens = [
    ...tokenizedKnowledge.map((k) => k.tokens),
    ...tokenizedStatements.map((s) => s.tokens),
  ];

  const idfMap = calculateIDF(corpusTokens);

  // Pre-compute TF-IDF vectors for knowledge entries (Optimization)
  const knowledgeVectors = tokenizedKnowledge.map(({ entry, tokens }) => {
    const tfMap = calculateTF(tokens);
    const tfidfVector = new Map();
    for (const [term, tfVal] of tfMap.entries()) {
      const idfVal = idfMap.get(term) || 1.0;
      tfidfVector.set(term, tfVal * idfVal);
    }
    return {
      entry,
      tokens,
      tfidfVector,
    };
  });

  // Process each statement against pre-computed knowledge vectors
  const results = tokenizedStatements.map(({ statement, tokens: stmtTokens }) => {
    const stmtText = statement.text || statement.originalStatement || '';
    const stmtTFMap = calculateTF(stmtTokens);
    const stmtTFIDFVector = new Map();

    for (const [term, tfVal] of stmtTFMap.entries()) {
      const idfVal = idfMap.get(term) || 1.0;
      stmtTFIDFVector.set(term, tfVal * idfVal);
    }

    // Compare statement vector against all candidate knowledge vectors
    const candidateScores = knowledgeVectors.map(({ entry, tokens: kTokens, tfidfVector: kVector }) => {
      const rawSimilarity = calculateCosineSimilarity(stmtTFIDFVector, kVector);
      
      // Calculate shared terms for explainability
      const kTokenSet = new Set(kTokens);
      const sharedTerms = stmtTokens.filter((t) => kTokenSet.has(t));
      const uniqueSharedTerms = [...new Set(sharedTerms)];

      return {
        knowledgeId: entry.id || entry.sourceId,
        sourceId: entry.sourceId || entry.id,
        title: entry.title || entry.sourceTitle || 'Untitled Source',
        content: (entry.content || entry.extractedText || '').substring(0, 300),
        topics: entry.topics || [],
        similarity: parseFloat(rawSimilarity.toFixed(4)),
        sharedTerms: uniqueSharedTerms,
        sharedTermsCount: uniqueSharedTerms.length,
        retrievalReason: entry.retrievalReason || 'matched_topic',
      };
    });

    // Sort candidate scores descending by similarity
    candidateScores.sort((a, b) => b.similarity - a.similarity);

    const topCandidate = candidateScores[0] || null;
    const isMatched = topCandidate && topCandidate.similarity >= threshold;
    const status = isMatched ? COMPARISON_STATUS.MATCHED : COMPARISON_STATUS.NO_SUFFICIENT_MATCH;

    return {
      statementId: statement.id || statement.statementId,
      documentId: statement.documentId || null,
      documentName: statement.documentName || null,
      statementText: stmtText,
      topic: statement.primaryTopic || (statement.detectedTopics ? statement.detectedTopics[0] : null),
      comparisonStatus: status,
      bestMatch: topCandidate ? {
        knowledgeId: topCandidate.knowledgeId,
        sourceId: topCandidate.sourceId,
        title: topCandidate.title,
        content: topCandidate.content,
        similarity: topCandidate.similarity,
        sharedTerms: topCandidate.sharedTerms,
        sharedTermsCount: topCandidate.sharedTermsCount,
        retrievalReason: topCandidate.retrievalReason,
      } : null,
      alternatives: candidateScores.slice(1, 4), // Top 3 alternative matches
      threshold,
      hasNegationToken: detectNegation(stmtText),
      hasNumericValues: detectNumericValues(stmtText),
    };
  });

  const matchedCount = results.filter((r) => r.comparisonStatus === COMPARISON_STATUS.MATCHED).length;

  return {
    success: true,
    comparisonStatus: matchedCount > 0 ? COMPARISON_STATUS.MATCHED : COMPARISON_STATUS.NO_SUFFICIENT_MATCH,
    totalStatementsAnalyzed: statements.length,
    matchedStatementsCount: matchedCount,
    unmatchedStatementsCount: statements.length - matchedCount,
    threshold,
    results,
  };
}

module.exports = {
  compareStatementsToKnowledge,
  tokenizeText,
  calculateTF,
  calculateIDF,
  calculateCosineSimilarity,
  detectNegation,
  detectNumericValues,
};
