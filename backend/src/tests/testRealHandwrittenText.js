const fs = require('fs');
const { registerUpload } = require('../services/uploadRegistryService');
const { analyzeErrorDetectionDocument } = require('../services/errorDetection/errorDetectionService');

const text = `CAT Test (Cloud Computing)

1a) Data Parallelism
Given:
We have 1000 high-resolution photos, & each photo goes through the same three steps:
1. Resizing 2. Applying an AI color filter 3. watermarking and saving

Answer:-
This can be related to data parallelism, where the same operation is performed simultaneously on different portions of data.

Instead of Processing:
Photo 1 -> Photo 2 -> Photo 3 .... -> Photo 1000 we divide the 1000 photos among multiple Processors / cores - Each processor performs the same sequence of operation on a different set of photos. Therefore, this is data parallelism, because the same computation is applied independently to multiple data items simultaneously. It reduces the overall processing time.

1b) Fog Computing vs Cloud Computing
Fog Computing:
Fog computing extends cloud capabilities closer to the end devices / users. Processing is performed at intermediate devices such as gateways, routers & edge servers.

Cloud computing:-
Cloud computing provides computing, storage & software resources through centralized remote data centers over the internet.`;

fs.writeFileSync('uploads/Cloud_Computing_Test.txt', text);

async function run() {
  const user = { uid: 'test-user', role: 'student' };
  const session = registerUpload(user.uid, 'single', [
    {
      originalName: 'Cloud_Computing_Test.txt',
      uploadPath: 'c:/trustlens/backend/uploads/Cloud_Computing_Test.txt',
      mimeType: 'text/plain',
      size: text.length
    }
  ]);
  
  console.log('Running analysis on REAL text...');
  const res = await analyzeErrorDetectionDocument(user, session.uploadId);
  console.log('\n=== REAL TEXT VERIFICATION RESULT ===');
  console.log('Success:', res.success);
  console.log('ReportId:', res.reportId);
  console.log('Domain:', res.domain, '| Topic:', res.primaryTopic);
  console.log('Findings count:', res.findings?.length);
  for (const f of res.findings) {
    console.log(`- [${f.classification}] "${f.statement.replace(/\s+/g, ' ').substring(0, 70)}..." (Sim: ${Math.round(f.similarityScore * 100)}%)`);
  }
}

run().catch(console.error);
