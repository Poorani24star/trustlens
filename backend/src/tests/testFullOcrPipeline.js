const { analyzeErrorDetectionDocument } = require('../services/errorDetection/errorDetectionService');

async function testFull() {
  const user = { uid: 'test-user', role: 'student' };
  const { registerUpload } = require('../services/uploadRegistryService');
  
  const session = registerUpload(user.uid, 'single', [
    {
      originalName: 'WhatsApp Image 2026-09-28 at 4.30.36 PM.jpeg',
      uploadPath: 'c:/trustlens/backend/uploads/WhatsApp_Image_2026-09-28_at_4_30_36_PM-1790593467184-305067.jpeg',
      mimeType: 'image/jpeg',
      size: 163594
    }
  ]);
  const uploadId = session.uploadId;

  console.log('Running analyzeErrorDetectionDocument...');
  const res = await analyzeErrorDetectionDocument(user, uploadId, {
    onProgress: (p) => {
      console.log('PROGRESS:', p.stageTitle, '|', p.percent + '%', '|', p.message);
    }
  });

  console.log('\nRESULT:');
  console.log('Success:', res.success);
  console.log('Supported:', res.supported);
  console.log('Message:', res.message);
  console.log('ReportId:', res.reportId);
  console.log('Findings count:', res.findings?.length);
}

testFull().catch(console.error);
