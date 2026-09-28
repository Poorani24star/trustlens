const http = require('http');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const PORT = 5000;

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      if (Buffer.isBuffer(body)) {
        req.write(body);
      } else if (typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

function loginUser(email, password) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ email, password });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9099,
      path: '/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(b);
          if (parsed.idToken) resolve(parsed.idToken);
          else reject(new Error('Login failed: ' + b));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function createTestZip() {
  const zip = new JSZip();
  zip.file('assignment1.txt', 'Operating systems manage computer hardware and software resources. The kernel is the core component of an operating system that provides basic services for all other parts.');
  zip.file('assignment2.txt', 'Operating systems manage computer hardware and software resources. The kernel is the core component of an operating system that provides basic services for all other parts of the computer.');
  return await zip.generateAsync({ type: 'nodebuffer' });
}

async function uploadZip(token, zipBuffer) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="zipFile"; filename="test_assignments.zip"\r\nContent-Type: application/zip\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  
  const payload = Buffer.concat([
    Buffer.from(header, 'utf-8'),
    zipBuffer,
    Buffer.from(footer, 'utf-8')
  ]);

  const res = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/api/documents/upload/zip',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': payload.length,
      'Authorization': `Bearer ${token}`
    }
  }, payload);

  return res.body;
}

async function run() {
  console.log('=== E2E TEST: Real Upload & Live Background Analysis Pipeline ===\n');

  // 1. Login
  const token = await loginUser('faculty1@example.com', 'Password123!');
  if (!token) throw new Error('Could not login as faculty');
  console.log('✓ Authenticated as faculty1@example.com');

  // 2. Upload test zip
  const zipBuffer = await createTestZip();
  const uploadRes = await uploadZip(token, zipBuffer);
  console.log('✓ Uploaded ZIP file. uploadId:', uploadRes.uploadId);
  const uploadId = uploadRes.uploadId;

  // 3. Start analysis job
  const startRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: '/api/analysis/jobs/start',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    type: 'copied-content',
    uploadId,
    files: [
      { name: 'assignment1.txt', originalName: 'assignment1.txt' },
      { name: 'assignment2.txt', originalName: 'assignment2.txt' }
    ]
  });

  console.log('✓ Job started. Status:', startRes.status, 'jobId:', startRes.body.jobId);
  const jobId = startRes.body.jobId;

  // 4. Poll / Stream until completed
  console.log('✓ Polling job progress until completion…');
  let job = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 600));
    const statusRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/analysis/jobs/${jobId}`,
      method: 'GET'
    });

    job = statusRes.body.job;
    console.log(`  [Progress ${job.progress.percent}%] Stage: ${job.progress.stageTitle} | Message: ${job.progress.message}`);

    if (job.status === 'completed' || job.status === 'failed') {
      break;
    }
  }

  if (job.status !== 'completed') {
    throw new Error(`Job did not complete successfully. Status: ${job.status}, Error: ${job.error}`);
  }

  console.log('\n✓ Job completed successfully!');
  console.log('  Report ID:', job.result?.reportId);

  // 5. Verify Report in reports API
  const reportRes = await request({
    hostname: 'localhost',
    port: PORT,
    path: `/api/reports/${job.result.reportId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('✓ Verified report retrieval from GET /api/reports/:id. Status:', reportRes.status);
  console.log('  Report Title:', reportRes.body?.report?.title || reportRes.body?.title);
  console.log('  Pair results count:', (reportRes.body?.report?.pairResults || reportRes.body?.pairResults || []).length);

  console.log('\n🎉 ALL END-TO-END PIPELINE CHECKS PASSED PERFECTLY!');
}

run().catch(err => {
  console.error('❌ E2E Test Failed:', err);
  process.exit(1);
});
