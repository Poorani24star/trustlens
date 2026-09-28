require('dotenv').config();
const { registerUpload } = require('../services/uploadRegistryService');
const { analyzeErrorDetectionDocument } = require('../services/errorDetection/errorDetectionService');

async function testVisionReport() {
  const user = { uid: 'test-user', role: 'student' };
  const session = registerUpload(user.uid, 'single', [
    {
      originalName: 'WhatsApp_Image_2026-09-28_at_4_30_36_PM.jpeg',
      uploadPath: 'c:/trustlens/backend/uploads/WhatsApp_Image_2026-09-28_at_4_30_36_PM-1790595155774-883493.jpeg',
      mimeType: 'image/jpeg',
      size: 163594
    }
  ]);
  
  console.log('Running analysis with Gemini Vision active...');
  const res = await analyzeErrorDetectionDocument(user, session.uploadId);
  console.log('\n=== ANALYSIS REPORT WITH GEMINI VISION ===');
  console.log('Success:', res.success);
  console.log('ReportId:', res.reportId);
  console.log('Domain:', res.domain, '| Topic:', res.primaryTopic);
  console.log('Extraction Method:', res.documents?.[0]?.extractionMethod);
  console.log('Findings count:', res.findings?.length);
  for (const f of res.findings) {
    const preview = f.statement.replace(/\s+/g, ' ').substring(0, 80);
    console.log(`- [${f.classification}] "${preview}..."`);
  }
}

testVisionReport().catch(console.error);
