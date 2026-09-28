/**
 * TrustLens Diff Utilities
 * Implements token-level text comparison and Longest Common Subsequence (LCS)
 * algorithm to highlight exact matched words versus modified/substituted phrases
 * between two passages.
 */

/**
 * Tokenizes text into words and whitespace/punctuation tokens, preserving formatting.
 * @param {string} text 
 * @returns {Array<string>}
 */
export function tokenizeText(text) {
  if (!text || typeof text !== 'string') return [];
  // Tokenize words, whitespace, and punctuation as separate elements
  return text.match(/\S+|\s+/g) || [];
}

/**
 * Computes the Longest Common Subsequence (LCS) table for two token arrays.
 * Compares tokens case-insensitively while preserving original casing.
 */
function computeLcsMatrix(tokensA, tokensB) {
  const m = tokensA.length;
  const n = tokensB.length;

  // Optimize: single dimensional or 2D array
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));

  for (let i = 1; i <= m; i++) {
    const tokenA = tokensA[i - 1].trim().toLowerCase();
    for (let j = 1; j <= n; j++) {
      const tokenB = tokensB[j - 1].trim().toLowerCase();
      if (tokenA === tokenB && tokenA.length > 0) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Computes word-level diff between two text passages.
 * Returns highlighted token lists for Document A and Document B.
 * 
 * @param {string} textA - Text passage from Document A
 * @param {string} textB - Text passage from Document B
 * @returns {{
 *   tokensA: Array<{text: string, type: 'match' | 'removed' | 'normal'}>,
 *   tokensB: Array<{text: string, type: 'match' | 'added' | 'normal'}>,
 *   matchCount: number,
 *   totalWordsA: number,
 *   totalWordsB: number
 * }}
 */
export function computeWordDiff(textA, textB) {
  const strA = (textA || '').trim();
  const strB = (textB || '').trim();

  // Fast path: exact match
  if (strA === strB && strA.length > 0) {
    const rawTokens = tokenizeText(strA);
    const matchedTokens = rawTokens.map(t => ({
      text: t,
      type: /\S/.test(t) ? 'match' : 'normal',
    }));

    return {
      tokensA: matchedTokens,
      tokensB: matchedTokens,
      matchCount: rawTokens.filter(t => /\S/.test(t)).length,
      totalWordsA: rawTokens.filter(t => /\S/.test(t)).length,
      totalWordsB: rawTokens.filter(t => /\S/.test(t)).length,
      isExact: true,
    };
  }

  const rawTokensA = tokenizeText(textA || '');
  const rawTokensB = tokenizeText(textB || '');

  // If one string is completely empty
  if (rawTokensA.length === 0 || rawTokensB.length === 0) {
    return {
      tokensA: rawTokensA.map(t => ({ text: t, type: /\S/.test(t) ? 'removed' : 'normal' })),
      tokensB: rawTokensB.map(t => ({ text: t, type: /\S/.test(t) ? 'added' : 'normal' })),
      matchCount: 0,
      totalWordsA: rawTokensA.filter(t => /\S/.test(t)).length,
      totalWordsB: rawTokensB.filter(t => /\S/.test(t)).length,
      isExact: false,
    };
  }

  // Cap token size to prevent extreme matrix sizes on accidental whole-book strings
  const MAX_DIFF_TOKENS = 600;
  const tokensA = rawTokensA.slice(0, MAX_DIFF_TOKENS);
  const tokensB = rawTokensB.slice(0, MAX_DIFF_TOKENS);

  const dp = computeLcsMatrix(tokensA, tokensB);

  // Backtrack through the matrix to construct token diff annotations
  let i = tokensA.length;
  let j = tokensB.length;

  const resultA = [];
  const resultB = [];
  let matchCount = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const normA = tokensA[i - 1].trim().toLowerCase();
      const normB = tokensB[j - 1].trim().toLowerCase();

      if (normA === normB && normA.length > 0) {
        resultA.unshift({ text: tokensA[i - 1], type: 'match' });
        resultB.unshift({ text: tokensB[j - 1], type: 'match' });
        matchCount++;
        i--;
        j--;
        continue;
      }
    }

    if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      const isWord = /\S/.test(tokensB[j - 1]);
      resultB.unshift({ text: tokensB[j - 1], type: isWord ? 'added' : 'normal' });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      const isWord = /\S/.test(tokensA[i - 1]);
      resultA.unshift({ text: tokensA[i - 1], type: isWord ? 'removed' : 'normal' });
      i--;
    }
  }

  return {
    tokensA: resultA,
    tokensB: resultB,
    matchCount,
    totalWordsA: rawTokensA.filter(t => /\S/.test(t)).length,
    totalWordsB: rawTokensB.filter(t => /\S/.test(t)).length,
    isExact: false,
  };
}

/**
 * Returns color classes for similarity percentage badges
 * @param {number} score - Similarity percentage (0 - 100)
 */
export function getSimilarityColor(score) {
  const s = Number(score) || 0;
  if (s >= 80) return { bg: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500', border: 'border-red-300' };
  if (s >= 60) return { bg: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500', border: 'border-amber-300' };
  return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', border: 'border-emerald-300' };
}
