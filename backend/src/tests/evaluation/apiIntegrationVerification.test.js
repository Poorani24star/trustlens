const assert = require('assert');
const { analyzeDocument: analyzeErrorDoc } = require('../../controllers/errorDetectionController');
const { analyzeCopiedContent: analyzeCopiedDoc } = require('../../controllers/copiedContentController');
const { listReports, getReportById } = require('../../controllers/reportController');

console.log('====================================================');
console.log('RUNNING PHASE 13C: API & FIRESTORE PERSISTENCE VERIFICATION');
console.log('====================================================');

let passedCount = 0;
let totalCount = 0;

// Helper to construct mock Express req/res objects
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

// 1. Error Detection Controller Validation Check (Missing temporaryUploadId)
async function testErrorDetectionControllerValidation() {
  totalCount++;
  const req = { body: {}, user: { uid: 'test-user-123' } };
  const res = createMockRes();

  await analyzeErrorDoc(req, res, (err) => { throw err; });

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.message, 'temporaryUploadId is required');

  console.log('[PASS] API Validation ED: Missing temporaryUploadId returns HTTP 400.');
  passedCount++;
}

// 2. Copied Content Controller Validation Check (Missing temporaryUploadId)
async function testCopiedContentControllerValidation() {
  totalCount++;
  const req = { body: {}, user: { uid: 'test-user-123' } };
  const res = createMockRes();

  await analyzeCopiedDoc(req, res, (err) => { throw err; });

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.message, 'temporaryUploadId is required');

  console.log('[PASS] API Validation CC: Missing temporaryUploadId returns HTTP 400.');
  passedCount++;
}

// 3. Report Controller List Response Format Check
async function testReportControllerListFormat() {
  totalCount++;
  const req = { user: { uid: 'test-user-123' }, query: {} };
  const res = createMockRes();

  // Test report list handler
  await listReports(req, res, (err) => { throw err; });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert(Array.isArray(res.body.reports));

  console.log(`[PASS] API Route GET /api/reports: Returns HTTP 200 with ${res.body.reports.length} user reports.`);
  passedCount++;
}

async function runAll() {
  await testErrorDetectionControllerValidation();
  await testCopiedContentControllerValidation();
  await testReportControllerListFormat();

  console.log('====================================================');
  console.log(`API INTEGRATION SUMMARY: ${passedCount} / ${totalCount} PASSED`);
  console.log('====================================================');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error(`[FAIL] API Verification error: ${err.message}`);
  process.exit(1);
});
