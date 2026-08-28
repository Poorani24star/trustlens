/**
 * Statement Extraction and Preparation Service (Task 8 / E1)
 * Responsible for extracting clean, individual factual statements/claims from document text,
 * normalizing PDF extraction artifacts, merging broken sentence fragments, filtering headings/noise,
 * preserving original wording and technical terminology, and preparing valid claims for factual checking.
 */

const MIN_STATEMENT_LENGTH = 10;
const MIN_STATEMENT_WORDS = 3;

/**
 * Common technical abbreviations to protect during sentence splitting
 */
const TECHNICAL_ABBREVIATIONS = [
  'e.g.', 'i.e.', 'vs.', 'fig.', 'ref.', 'al.', 'etc.', 'vol.', 'no.', 'p.', 'pp.',
  'dr.', 'prof.', 'dept.', 'corp.', 'inc.', 'ltd.', 'st.', 'v.'
];

/**
 * Common predicate verbs / copulas in technical writing
 */
const PREDICATE_VERBS_REGEX = /\b(is|are|was|were|has|have|had|provides|provide|stores|store|uses|use|operates|operate|transfers|transfer|connects|connect|transmits|transmit|encrypts|encrypt|requires|require|contains|contain|consists|consist|translates|translate|routes|route|implements|implement|enables|enable|defines|define|supports|support|includes|include|executes|execute|processes|process|manages|manage|allocates|allocate|handles|handle|allows|allow|performs|perform|generates|generate|equals|equal|created|invented|discovered)\b/i;

/**
 * Common heading and metadata keywords
 */
const HEADING_KEYWORDS_REGEX = /^(chapter|section|part|figure|table|index|overview|summary|introduction|conclusion|references|bibliography|table\s+of\s+contents|contents|notes|lecture|assignment|appendix|types\s+of|characteristics\s+of|advantages\s+of|disadvantages\s+of|examples\s+of|definition\s+of|\d+(\.\d+)*)\b/i;

/**
 * Safe text normalization without destroying meaningful technical punctuation.
 * Removes common PDF extraction artifacts:
 * - Line-break hyphenation (e.g. "communi-\ncation" -> "communication")
 * - Standalone pagination patterns (e.g. "-- 1 of 1 --", "Page 1 of 5")
 * - Repeated header/footer artifacts across pages
 * - Non-breaking spaces and excessive spacing
 */
function normalizeTextForExtraction(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' '); // Replace non-breaking spaces

  // 1. De-hyphenate words broken across soft line breaks
  text = text.replace(/([a-zA-Z]{2,})-\n\s*([a-zA-Z]{2,})/g, '$1$2');

  // 2. Remove common PDF pagination markers (e.g. "-- 1 of 1 --", "Page 1 of 5", "- 1 -")
  text = text
    .replace(/--\s*\d+\s*(?:of|\/)\s*\d+\s*--/gi, '\n')
    .replace(/(?:^|\n)\s*(?:page|pg\.?)\s+\d+(?:\s*(?:of|\/)\s*\d+)?\s*(?:\n|$)/gi, '\n')
    .replace(/(?:^|\n)\s*[-—–]\s*\d+\s*[-—–]\s*(?:\n|$)/g, '\n');

  // 3. Remove repeated identical header/footer lines appearing 3+ times
  const lines = text.split('\n');
  const lineFrequency = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 3 && trimmed.length < 80 && !/[.!?]$/.test(trimmed)) {
      lineFrequency[trimmed] = (lineFrequency[trimmed] || 0) + 1;
    }
  }

  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    if (lineFrequency[trimmed] && lineFrequency[trimmed] >= 3 && !PREDICATE_VERBS_REGEX.test(trimmed)) {
      return false; // Filter out repeated header artifact
    }
    return true;
  });

  text = cleanedLines.join('\n');

  // 4. Collapse multiple spaces & normalize blank lines
  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

/**
 * Preprocesses raw lines within a paragraph:
 * - Joins soft PDF line wraps into coherent sentences
 * - Merges introductory colon fragments with their continuation (e.g. "The two extremes are:\npublic cloud and private cloud.")
 * - Strips numbering markers (e.g. "Step 1:\nConfigure network." -> "Configure network.")
 * - Strips bullet markers while retaining bullet content
 */
function cleanAndMergeLines(paragraphText) {
  if (!paragraphText || typeof paragraphText !== 'string') return [];

  const rawLines = paragraphText.split(/\n+/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 0) return [];

  const mergedLines = [];
  let i = 0;

  while (i < rawLines.length) {
    let current = rawLines[i];

    // Strip standalone step/numbering headers if on own line followed by next line
    // e.g. "Step 1:" or "Step 1"
    const stepPrefixMatch = current.match(/^step\s+\d+\s*:?$/i);
    if (stepPrefixMatch && i + 1 < rawLines.length) {
      i++;
      current = rawLines[i];
    }

    // Strip leading bullet markers from current line: e.g. "• ", "- ", "* ", "1. ", "(1) "
    const bulletMatch = current.match(/^([-*•\u2022\u25E6\u25AA\u2023\u2219]|(?:\d+|[a-zA-Z])[\.\)])\s+(.+)$/);
    if (bulletMatch) {
      current = bulletMatch[2].trim();
    }

    // Strip inline step prefix: e.g. "Step 1: Configure the network." -> "Configure the network."
    const inlineStepMatch = current.match(/^step\s+\d+\s*:\s*(.+)$/i);
    if (inlineStepMatch) {
      current = inlineStepMatch[1].trim();
    }

    // Check if current line ends with ':' (introductory fragment / heading with following text)
    if (current.endsWith(':') && i + 1 < rawLines.length) {
      let nextLine = rawLines[i + 1];
      const nextBulletMatch = nextLine.match(/^([-*•\u2022\u25E6\u25AA\u2023\u2219]|(?:\d+|[a-zA-Z])[\.\)])\s+(.+)$/);
      if (nextBulletMatch) {
        nextLine = nextBulletMatch[2].trim();
      }

      // If the introductory line is a phrase like "The two extremes are:" or "Advantages include:" or "Examples of:"
      const isIntroductory = /^(the\s+.*(are|is|include|includes|consist\s+of|comprises)|advantages\s+include|examples\s+include|examples\s+of|types\s+include|characteristics\s+include|types\s+are|definition:?)\s*:?$/i.test(current);

      if (isIntroductory) {
        // Merge: "The two extremes are:" + "public cloud and private cloud." -> "The two extremes are public cloud and private cloud."
        const cleanCurrent = current.replace(/:\s*$/, '');
        current = `${cleanCurrent} ${nextLine}`;
        i++; // consumed next line
      } else {
        // Standalone heading ending in colon, e.g. "Types of Networks:"
        // Push current as is; checkIsNoise will properly filter it as a heading
        mergedLines.push(current);
        i++;
        continue;
      }
    }

    // Merge wrapped lines that are part of the same continuous thought/sentence
    while (
      i + 1 < rawLines.length &&
      !/[.!?]$/.test(current) &&
      !/^([-*•\u2022\u25E6\u25AA\u2023\u2219]|(?:\d+|[a-zA-Z])[\.\)]|step\s+\d+)/i.test(rawLines[i + 1])
    ) {
      const nextLine = rawLines[i + 1];
      // Do not merge if current line is a bullet item that is a standalone short phrase
      if (/^[-*•\u2022\u25E6\u25AA\u2023\u2219]/.test(current) && current.split(/\s+/).length <= 3) {
        break;
      }
      if (current.endsWith(':')) {
        const isIntroHeading = /^(advantages|features|types|steps|examples|note|notes|summary|characteristics|properties):?$/i.test(current.trim());
        if (isIntroHeading) break;
        current = `${current.slice(0, -1)} ${nextLine}`;
      } else {
        current = `${current} ${nextLine}`;
      }
      i++;
    }

    mergedLines.push(current);
    i++;
  }

  return mergedLines;
}

/**
 * Smart technical sentence segmentation
 * Protects decimal numbers, abbreviations, technical slashes, and URLs
 */
function segmentParagraphIntoSentences(paragraphText) {
  if (!paragraphText || typeof paragraphText !== 'string') return [];

  const preparedLines = cleanAndMergeLines(paragraphText);
  const candidateSentences = [];

  for (const line of preparedLines) {
    let protectedText = line;

    // Protect URLs
    protectedText = protectedText.replace(/(https?:\/\/[^\s]+)/gi, (match) => {
      return match.replace(/\./g, '___DOT___').replace(/\//g, '___SLASH___');
    });

    // Protect decimal numbers (e.g. 3.14, Python 3.12)
    protectedText = protectedText.replace(/(\d+)\.(\d+)/g, '$1___DECIMAL___$2');

    // Protect technical slashes (e.g. TCP/IP, I/O, CI/CD, A/B)
    protectedText = protectedText.replace(/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/g, '$1___SLASH___$2');

    // Protect common technical abbreviations
    TECHNICAL_ABBREVIATIONS.forEach(abbr => {
      const escaped = abbr.replace(/\./g, '\\.');
      const regex = new RegExp(`\\b${escaped}`, 'gi');
      protectedText = protectedText.replace(regex, (match) => {
        return match.replace(/\./g, '___DOT___');
      });
    });

    // Split line on sentence boundaries (. ! ?) followed by whitespace
    const sentenceSplits = protectedText.split(/(?<=[.!?])\s+/);
    for (const split of sentenceSplits) {
      const restored = split
        .replace(/___DECIMAL___/g, '.')
        .replace(/___DOT___/g, '.')
        .replace(/___SLASH___/g, '/')
        .trim();

      if (restored) {
        candidateSentences.push(restored);
      }
    }
  }

  return candidateSentences;
}

/**
 * Checks if a candidate string is an obvious non-factual noise element or fragment
 * (e.g., headings, footers, standalone fragments, incomplete phrases, references, code)
 */
function checkIsNoise(text) {
  if (!text || typeof text !== 'string') {
    return { isNoise: true, reason: 'empty' };
  }

  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  // 1. Extreme short length check (e.g. "TCP", "Database", "Types", "Step 1")
  if (wordCount < 2 || trimmed.length < 4) {
    return { isNoise: true, reason: 'fragment' };
  }

  // 2. Trailing colon (headings or dangling intro phrases, e.g. "Types of Networks:", "Characteristics:")
  if (trimmed.endsWith(':')) {
    return { isNoise: true, reason: 'heading' };
  }

  // 3. Dangling incomplete ends (e.g. ending in preposition/conjunction)
  if (/\b(and|or|such as|including|with|for|the|a|an|is|are|of|to|in|from|by|as)\s*$/i.test(trimmed)) {
    return { isNoise: true, reason: 'fragment' };
  }

  // 4. Standalone headings / titles (short text without ending punctuation and no predicate verb)
  // e.g. "Computer Networks", "Cloud Computing", "Chapter 1 Introduction", "Table of Contents"
  if (
    trimmed.length < 60 &&
    !/[.!?]$/.test(trimmed) &&
    (HEADING_KEYWORDS_REGEX.test(trimmed) || !PREDICATE_VERBS_REGEX.test(trimmed))
  ) {
    return { isNoise: true, reason: 'heading' };
  }

  // 5. Short 2-3 word phrase without verb or ending punctuation (e.g. "Fast processing", "Network layers")
  if (wordCount <= 3 && !/[.!?]$/.test(trimmed) && !PREDICATE_VERBS_REGEX.test(trimmed)) {
    return { isNoise: true, reason: 'fragment' };
  }

  // 6. Page footers / numbers / copyright / page markers
  if (
    /^(page\s+\d+(\s+of\s+\d+)?|copyright\s+©|\b\d{4}\s+all\s+rights\s+reserved|--\s*\d+\s*(of|\/)\s*\d+\s*--|--\s*\d+\s*--)\b/i.test(trimmed) ||
    /^[-—–]\s*\d+\s*[-—–]$/.test(trimmed)
  ) {
    return { isNoise: true, reason: 'footer' };
  }

  // 7. Standalone Reference / Bibliography entries (e.g. "[1] Author, Title, 2024...")
  if (/^\[\d+\]\s+[A-Z]/i.test(trimmed) && (trimmed.includes('http') || trimmed.includes('vol.') || trimmed.includes('pp.'))) {
    return { isNoise: true, reason: 'reference_entry' };
  }

  // 8. Isolated source code lines / blocks
  if (
    /^(function|class|import|export|#include|package|public\s+static|private|protected|const|let|var|def|return|SELECT\s+.*\s+FROM|INSERT\s+INTO)\b/.test(trimmed) ||
    /^[{}();<>=\+\-\*\/\\|]+$/.test(trimmed)
  ) {
    return { isNoise: true, reason: 'code_block' };
  }

  return { isNoise: false, reason: null };
}

/**
 * Main function: Extracts clean factual candidate statements from document text
 *
 * @param {string} rawText - Extracted document text
 * @param {Object} [options] - Document & topic metadata
 * @returns {Object} Structured statement extraction result
 */
function extractAndPrepareStatements(rawText = '', options = {}) {
  const documentId = options.documentId || `doc_${Date.now()}`;
  const documentName = options.documentName || 'Document.txt';
  const topicDetection = options.topicDetection || {};
  const primaryTopic = topicDetection.primaryTopic || null;
  const detectedTopics = Array.isArray(topicDetection.detectedTopics) ? topicDetection.detectedTopics : [];

  const normalized = normalizeTextForExtraction(rawText);

  if (!normalized) {
    return {
      success: true,
      documentId,
      documentName,
      domain: topicDetection.domain || 'Computer Science',
      primaryTopic,
      detectedTopics,
      totalCandidates: 0,
      readyStatements: [],
      ignoredStatements: [],
      failedStatements: [],
      statements: [],
      debugInfo: {
        rawLength: (rawText || '').length,
        normalizedLength: 0,
        acceptedCount: 0,
        filteredCount: 0,
      },
      summary: {
        totalCandidates: 0,
        readyStatements: 0,
        ignoredStatements: 0,
        failedStatements: 0,
      },
    };
  }

  // Split normalized text into paragraphs
  const paragraphs = normalized.split(/\n\n+/);
  const allStatements = [];
  const readyList = [];
  const ignoredList = [];
  const failedList = [];

  let globalIndex = 1;

  const getPageForStatement = (stmtText) => {
    if (!Array.isArray(options.pages) || options.pages.length === 0) {
      return options.sourcePage || null;
    }
    const cleanSnippet = stmtText.slice(0, 35).toLowerCase().trim();
    for (const pg of options.pages) {
      if (pg.text && pg.text.toLowerCase().includes(cleanSnippet)) {
        return pg.pageNumber;
      }
    }
    return options.pages[0]?.pageNumber || 1;
  };

  paragraphs.forEach((pText, pIdx) => {
    const paragraphIndex = pIdx + 1;
    const candidateSentences = segmentParagraphIntoSentences(pText);

    candidateSentences.forEach((sentenceText) => {
      const { isNoise, reason } = checkIsNoise(sentenceText);
      const statementId = `stmt-${documentId}-${globalIndex}`;
      const sourcePage = getPageForStatement(sentenceText);

      const stmtObj = {
        id: statementId,
        statementId,
        documentId,
        documentName,
        text: sentenceText, // Exact original wording preserved
        statementText: sentenceText,
        originalStatement: sentenceText, // Exact original wording preserved
        statementIndex: globalIndex,
        paragraphIndex,
        sourcePage,
        page: sourcePage,
        primaryTopic,
        detectedTopics,
        status: isNoise ? 'ignored' : 'ready',
        reason: isNoise ? reason : null,
        createdAt: new Date().toISOString(),
      };

      allStatements.push(stmtObj);

      if (isNoise) {
        ignoredList.push(stmtObj);
      } else {
        readyList.push(stmtObj);
      }

      globalIndex++;
    });
  });

  return {
    success: true,
    documentId,
    documentName,
    domain: topicDetection.domain || 'Computer Science',
    primaryTopic,
    detectedTopics,
    totalCandidates: allStatements.length,
    readyStatements: readyList,
    ignoredStatements: ignoredList,
    failedStatements: failedList,
    statements: allStatements,
    debugInfo: {
      rawLength: (rawText || '').length,
      normalizedLength: normalized.length,
      acceptedCount: readyList.length,
      filteredCount: ignoredList.length,
    },
    summary: {
      totalCandidates: allStatements.length,
      readyStatements: readyList.length,
      ignoredStatements: ignoredList.length,
      failedStatements: failedList.length,
    },
  };
}

module.exports = {
  extractAndPrepareStatements,
  normalizeTextForExtraction,
  segmentParagraphIntoSentences,
  cleanAndMergeLines,
  checkIsNoise,
};
