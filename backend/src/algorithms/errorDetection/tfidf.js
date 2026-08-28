/**
 * Pure JavaScript manual TF-IDF Vectorizer
 */

/**
 * Computes Term Frequency (TF) map for a document token array
 * TF(t, d) = count(t in d) / total_tokens(d)
 * @param {string[]} tokens 
 * @returns {Map<string, number>}
 */
function computeTF(tokens) {
  const tfMap = new Map();
  if (!tokens || tokens.length === 0) return tfMap;

  const totalTokens = tokens.length;
  for (const token of tokens) {
    tfMap.set(token, (tfMap.get(token) || 0) + 1);
  }

  for (const [token, count] of tfMap.entries()) {
    tfMap.set(token, count / totalTokens);
  }

  return tfMap;
}

/**
 * Computes Inverse Document Frequency (IDF) for terms across a corpus of documents
 * IDF(t) = log( (1 + total_documents) / (1 + doc_freq(t)) ) + 1
 * @param {Array<string[]>} corpusTokensList - List of document token arrays
 * @returns {Map<string, number>}
 */
function computeIDF(corpusTokensList) {
  const idfMap = new Map();
  const totalDocs = corpusTokensList.length;
  if (totalDocs === 0) return idfMap;

  // Build document frequency map
  const dfMap = new Map();
  for (const tokens of corpusTokensList) {
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      dfMap.set(token, (dfMap.get(token) || 0) + 1);
    }
  }

  // Calculate smoothed IDF to prevent log(0) or division by 0
  for (const [token, df] of dfMap.entries()) {
    const idf = Math.log((1 + totalDocs) / (1 + df)) + 1;
    idfMap.set(token, idf);
  }

  return idfMap;
}

/**
 * Computes a TF-IDF vector as an array of numbers corresponding to a fixed vocabulary
 * @param {string[]} docTokens 
 * @param {string[]} vocabulary 
 * @param {Map<string, number>} idfMap 
 * @returns {number[]} Vector of TF-IDF scores
 */
function computeTFIDFVector(docTokens, vocabulary, idfMap) {
  const tfMap = computeTF(docTokens);
  const vector = new Array(vocabulary.length).fill(0);

  for (let i = 0; i < vocabulary.length; i++) {
    const term = vocabulary[i];
    const tf = tfMap.get(term) || 0;
    const idf = idfMap.get(term) || 1;
    vector[i] = tf * idf;
  }

  return vector;
}

/**
 * Builds vocabulary and vectorizes a statement against candidate passages
 * @param {string[]} statementTokens 
 * @param {Array<{passageTokens: string[]}>} candidates 
 * @returns {{statementVector: number[], candidateVectors: Array<number[]>, vocabulary: string[]}}
 */
function vectorizeStatementAndCandidates(statementTokens, candidates) {
  const corpus = [statementTokens, ...candidates.map(c => c.passageTokens)];

  // Build vocabulary set
  const vocabSet = new Set();
  for (const tokens of corpus) {
    for (const token of tokens) {
      vocabSet.add(token);
    }
  }
  const vocabulary = Array.from(vocabSet);

  // Compute IDF over corpus
  const idfMap = computeIDF(corpus);

  // Compute TF-IDF vectors
  const statementVector = computeTFIDFVector(statementTokens, vocabulary, idfMap);
  const candidateVectors = candidates.map(c => computeTFIDFVector(c.passageTokens, vocabulary, idfMap));

  return {
    statementVector,
    candidateVectors,
    vocabulary,
  };
}

module.exports = {
  computeTF,
  computeIDF,
  computeTFIDFVector,
  vectorizeStatementAndCandidates,
};
