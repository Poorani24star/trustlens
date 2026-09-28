const { extractImageOcrText } = require('../services/extraction/ocrExtractionService');

async function test() {
  const res = await extractImageOcrText('c:/trustlens/backend/uploads/WhatsApp_Image_2026-09-28_at_4_30_36_PM-1790593467184-305067.jpeg');
  const text = res.text.toLowerCase();
  console.log('Words found in text:');
  const candidates = ['core', 'cores', 'cloud', 'computing', 'compuliny', 'fog', 'parallel', 'parallelism', 'pomlelism', 'processor', 'pocassacs', 'data', 'device', 'devices', 'internet', 'ilewnst'];
  for (const c of candidates) {
    if (text.includes(c)) console.log('  -> MATCH:', c);
  }
}

test().catch(console.error);
