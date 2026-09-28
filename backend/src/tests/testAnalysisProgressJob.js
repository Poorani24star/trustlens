const http = require('http');

function apiLogin(email, password) {
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
          if (parsed.idToken) resolve(parsed);
          else reject(new Error('Login failed: ' + b));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function requestJson(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const payload = body ? JSON.stringify(body) : null;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, raw: b });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function testJobFlow() {
  console.log('=== TEST: Analysis Progress Job & SSE System ===\n');

  // 1. Authenticate as faculty
  const auth = await apiLogin('faculty1@example.com', 'Password123!');
  console.log('✓ Authenticated as faculty1@example.com');

  // 2. Prepare mock upload session and files
  const uploadId = `test_upl_${Date.now()}`;
  const files = [
    { originalName: 'doc1.pdf', size: 1024 },
    { originalName: 'doc2.pdf', size: 2048 }
  ];

  // 3. Test starting a job via POST /api/analysis/jobs/start
  const startRes = await requestJson('POST', '/api/analysis/jobs/start', {
    type: 'copied-content',
    uploadId,
    files
  }, auth.idToken);

  console.log('✓ POST /api/analysis/jobs/start status:', startRes.status);
  console.log('  Job ID returned:', startRes.data?.jobId);
  if (startRes.status !== 201 || !startRes.data?.jobId) {
    throw new Error('Failed to start analysis job: ' + JSON.stringify(startRes));
  }
  const jobId = startRes.data.jobId;

  // 4. Test GET /api/analysis/jobs/:jobId status snapshot
  const statusRes = await requestJson('GET', `/api/analysis/jobs/${jobId}`, null, auth.idToken);
  console.log('✓ GET /api/analysis/jobs/:jobId status:', statusRes.status);
  console.log('  Job stage:', statusRes.data?.job?.progress?.stageTitle);
  console.log('  Job files count:', statusRes.data?.job?.progress?.files?.length);
  if (statusRes.status !== 200 || !statusRes.data?.job) {
    throw new Error('Failed to fetch job status: ' + JSON.stringify(statusRes));
  }

  // 5. Test SSE Stream via GET /api/analysis/jobs/:jobId/events
  console.log('✓ Connecting to SSE stream at /api/analysis/jobs/:jobId/events…');
  const sseEvents = [];
  const sseReq = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/analysis/jobs/${jobId}/events`,
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${auth.idToken}`
      }
    }, res => {
      console.log('✓ SSE connection established. Content-Type:', res.headers['content-type']);
      res.on('data', chunk => {
        const text = chunk.toString();
        sseEvents.push(text);
      });
      resolve(req);
    });
    req.on('error', reject);
    req.end();
  });

  // Give SSE a moment to receive initial event
  await new Promise(r => setTimeout(r, 400));
  console.log(`✓ Received ${sseEvents.length} SSE chunk(s). Initial preview:\n  `, sseEvents[0]?.substring(0, 120).replace(/\n/g, ' '));

  // 6. Test Cancel via POST /api/analysis/jobs/:jobId/cancel
  console.log('✓ Testing Cancel: POST /api/analysis/jobs/:jobId/cancel…');
  const cancelRes = await requestJson('POST', `/api/analysis/jobs/${jobId}/cancel`, {
    reason: 'Testing cancellation flow'
  }, auth.idToken);
  console.log('  Cancel response status:', cancelRes.status, cancelRes.data?.message);
  if (cancelRes.status !== 200) {
    throw new Error('Cancel endpoint failed: ' + JSON.stringify(cancelRes));
  }

  // Verify status is now cancelled
  const postCancelStatus = await requestJson('GET', `/api/analysis/jobs/${jobId}`, null, auth.idToken);
  console.log('✓ Job status after cancel:', postCancelStatus.data?.job?.status);
  if (postCancelStatus.data?.job?.status !== 'cancelled') {
    throw new Error('Job status should be cancelled, got: ' + postCancelStatus.data?.job?.status);
  }

  // 7. Test Retry File endpoint POST /api/analysis/jobs/:jobId/retry-file
  console.log('✓ Testing Retry File: POST /api/analysis/jobs/:jobId/retry-file…');
  const retryRes = await requestJson('POST', `/api/analysis/jobs/${jobId}/retry-file`, {
    fileId: 'file_1'
  }, auth.idToken);
  console.log('  Retry response status:', retryRes.status, retryRes.data?.message);
  if (retryRes.status !== 200) {
    throw new Error('Retry endpoint failed: ' + JSON.stringify(retryRes));
  }

  sseReq.destroy();

  console.log('\n=================================================');
  console.log('🎉 ALL ANALYSIS JOB & SSE TESTS PASSED (100%)!');
  console.log('=================================================');
}

testJobFlow().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
