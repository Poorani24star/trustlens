const { validateDomain } = require('../services/errorDetection/domainValidationService');
const { extractImageOcrText } = require('../services/extraction/ocrExtractionService');
const { TOPIC_KEYWORDS, SUPPORTED_TOPICS } = require('../constants/domainConstants');

function levenshteinDistance(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

async function test() {
  const ocrRes = await extractImageOcrText('c:/trustlens/backend/uploads/WhatsApp_Image_2026-09-28_at_4_30_36_PM-1790593467184-305067.jpeg');
  console.log('Extracted length:', ocrRes.textLength);
  
  // Test current domain validation
  const currentValidation = validateDomain(ocrRes.text);
  console.log('Current validation:', currentValidation.supported, currentValidation.evidence);

  // Expanded keywords
  const expandedKeywords = { ...TOPIC_KEYWORDS };
  expandedKeywords['Cloud Computing'] = [
    ...(expandedKeywords['Cloud Computing'] || []),
    'cloud computing', 'fog computing', 'edge computing', 'data center', 'datacenter', 'edge servers', 'workload'
  ];
  expandedKeywords['Computer Architecture'] = [
    ...(expandedKeywords['Computer Architecture'] || []),
    'core', 'cores', 'multicore', 'processors', 'cpu'
  ];
  expandedKeywords['Distributed Systems'] = [
    ...(expandedKeywords['Distributed Systems'] || []),
    'data parallelism', 'parallelism', 'parallel processing', 'distributed computing'
  ];
  expandedKeywords['Computer Networks'] = [
    ...(expandedKeywords['Computer Networks'] || []),
    'devices', 'device', 'gateways', 'gateway'
  ];

  const rawText = ocrRes.text.toLowerCase();
  const tokens = rawText.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);

  let technicalScore = 0;
  const matchedKeywords = new Set();
  const matchedTopics = new Set();

  for (const topic of Object.keys(expandedKeywords)) {
    for (const kw of expandedKeywords[topic]) {
      const lowerKw = kw.toLowerCase();
      // 1. Exact phrase or word match
      const escapedKw = lowerKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedKw}(?:s|es)?\\b`, 'i');
      if (regex.test(rawText)) {
        matchedKeywords.add(kw);
        matchedTopics.add(topic);
        technicalScore += (kw.includes(' ') ? 2.0 : 1.0);
      } else if (!kw.includes(' ') && kw.length >= 6) {
        // 2. OCR fuzzy token match
        for (const token of tokens) {
          if (token.length >= 5 && Math.abs(token.length - lowerKw.length) <= 2) {
            const d = levenshteinDistance(token, lowerKw);
            if (d <= (lowerKw.length >= 9 ? 3 : 2)) {
              matchedKeywords.add(`${kw} (~${token})`);
              matchedTopics.add(topic);
              technicalScore += 0.8;
              break;
            }
          }
        }
      }
    }
  }

  console.log('\n--- ENHANCED VALIDATION ---');
  console.log('Matches:', Array.from(matchedKeywords));
  console.log('Topics:', Array.from(matchedTopics));
  console.log('Technical score:', technicalScore);
  console.log('Supported?:', technicalScore >= 1.5 && matchedKeywords.size >= 1);
}

test().catch(console.error);

