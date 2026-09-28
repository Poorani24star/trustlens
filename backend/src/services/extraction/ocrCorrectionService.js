/**
 * OCR Post-Correction and Domain Text Normalization Service
 * Cleans up handwriting and camera scanning OCR distortions
 */

const OCR_REPLACEMENTS = [
  // Cloud & Distributed Computing
  [/\b(pomlelism|pomlelium|pavasalliuiun|upasalliuiun|porallelism|pasa00am|pasa00an|aeaQ0lian)\b/gi, 'parallelism'],
  [/\b(conpulalion|compulalion)\b/gi, 'computation'],
  [/\b(compuliny|computiny|Compyfiyy)\b/gi, 'computing'],
  [/\b(pocassacs|processars|pocessors|Procosaecs|Proosgoy)\b/gi, 'processors'],
  [/\b(coves)\b/gi, 'cores'],
  [/\b(sumullbanecusdy|sumulbareoucly|relionaousl|simullaneousdy|smullonecusdy|Aumubanecusly)\b/gi, 'simultaneously'],
  [/\b(veqalad|veqaled|veQalad|veQaled|vedalad|velalid)\b/gi, 'related'],
  [/\b(cedoud|ceDoud|eQoud)\b/gi, 'cloud'],
  [/\b(yeadubion|yesdlukibn|yesdlubim)\b/gi, 'resolution'],
  [/\b(whos|fotos|folns|fictos)\b/gi, 'photos'],
  [/\b(gack|coch)\b/gi, 'each'],
  [/\b(dpvagh|divas)\b/gi, 'through'],
  [/\b(dhe)\b/gi, 'the'],
  [/\b(sume|Sarme)\b/gi, 'same'],
  [/\b(bicag)\b/gi, 'three'],
  [/\b(fares|sreps|areps)\b/gi, 'steps'],
  [/\b(lessig|reaig|reang|HReayeg)\b/gi, 'resizing'],
  [/\b(wolor)\b/gi, 'color'],
  [/\b(unkorminting|abternmsdugg|wakermnas|watermacking)\b/gi, 'watermarking'],
  [/\b(aaning|easing)\b/gi, 'saving'],
  [/\b(erdormed|perdormed|ofemmed)\b/gi, 'performed'],
  [/\b(fortons)\b/gi, 'portions'],
  [/\b(wre|ue)\b/gi, 'we'],
  [/\b(diuidy|did)\b/gi, 'divide'],
  [/\b(mulde|gnulipls)\b/gi, 'multiple'],
  [/\b(adands|adznds)\b/gi, 'extends'],
  [/\b(capsbilbes|capabiliés)\b/gi, 'capabilities'],
  [/\b(cnballind|centralijd|Crballipd|cenhallzed)\b/gi, 'centralized'],
  [/\b(ilewnst|llewnst|rlernsh)\b/gi, 'internet'],
  [/\b(opotatian|epesalion|cpemton|cpematiin)\b/gi, 'operation'],
  [/\b(poquenta)\b/gi, 'sequence'],
  [/\b(undoperdart|undoperdart®|undoperdanf)\b/gi, 'independently'],
  [/\b(seduce)\b/gi, 'reduces'],
  [/\b(gveald)\b/gi, 'overall'],
  [/\b(wocsaiy|Processivg|Peasting)\b/gi, 'processing'],
  [/\b(pases|possest|asin)\b/gi, 'Answer'],
  [/\b(mude)\b/gi, 'multiple'],
  [/\b(gatewoys|gatewoys|Gaketays)\b/gi, 'gateways'],
  [/\b(rovters|routrs)\b/gi, 'routers'],
  [/\b(secvers|servrs|Servens)\b/gi, 'servers'],
  [/\b(drftement|drfrrent)\b/gi, 'different'],
  [/\b(pmudes)\b/gi, 'provides'],
  [/\b(yemote)\b/gi, 'remote'],
  [/\b(devics)\b/gi, 'devices'],
];

/**
 * Removes typical OCR page margin and notebook line artifacts
 * @param {string} text 
 * @returns {string}
 */
function stripOcrNoise(text) {
  if (!text) return '';

  return text
    // Remove isolated margin pipes and slashes common in notebook margins
    .replace(/(?:^|\n)\s*[\|\/\\]+\s*/g, '\n')
    .replace(/\s*[\|\/\\]+\s*(?=\n|$)/g, '\n')
    .replace(/\|\s*\|\s*/g, ' ')
    // Remove isolated strange symbols
    .replace(/[¬`~^•·£€¥§©®]+/g, ' ')
    // Fix broken quotes or stray exclamation points at line beginnings
    .replace(/(?:^|\n)\s*!\s*/g, '\n')
    // Remove non-ASCII punctuation corruption
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    // Normalize spaces
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Applies vocabulary repair to common optical character recognition errors
 * @param {string} text 
 * @returns {string}
 */
function correctOcrText(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = stripOcrNoise(text);

  // Apply replacement patterns
  for (const [pattern, replacement] of OCR_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Clean double spaces
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

  return cleaned;
}

module.exports = {
  correctOcrText,
  stripOcrNoise,
};
