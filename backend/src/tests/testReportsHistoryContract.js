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

function requestJson(path, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method: 'GET',
      headers
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: b });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Mirror of Frontend parseSafeDate and getAnalyses
function parseSafeDate(dateVal) {
  if (!dateVal) return new Date();
  if (typeof dateVal === 'string' || typeof dateVal === 'number') {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof dateVal === 'object') {
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    const sec = dateVal._seconds ?? dateVal.seconds;
    if (typeof sec === 'number') return new Date(sec * 1000);
  }
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? new Date() : d;
}

function transformReports(rawReports) {
  return rawReports.map(r => {
    const isErrorDetection =
      r.reportType === 'error-detection' ||
      r.reportType === 'error_detection' ||
      r.type === 'error-detection' ||
      r.type === 'error_detection';

    const created = parseSafeDate(r.createdAt);
    
    const fileName =
      r.document?.originalName ||
      r.document?.fileName ||
      r.fileName ||
      r.title ||
      (isErrorDetection ? 'Document_Analysis.pdf' : 'Documents_Analysis.zip');
    
    const verified = r.summary?.verified ?? r.summary?.supported ?? 0;
    const contradictions = r.summary?.potentialContradictions ?? r.summary?.incorrect ?? r.summary?.contradictions ?? 0;
    const totalStmts = r.summary?.totalStatements ?? r.summary?.analyzedStatements ?? 0;

    const resultText = isErrorDetection
      ? `${verified} Verified · ${contradictions} Contradictions`
      : (r.summary?.matchingPairs ? `${r.summary.matchingPairs} matching pairs` : 'Analysis completed');

    const detailText = isErrorDetection
      ? `${totalStmts} statements analyzed against reference sources`
      : (`${r.summary?.totalPairsCompared || 0} pairs compared · ${r.summary?.matchingPairs || 0} matching pairs`);

    return {
      id: r.id || r.reportId,
      reportId: r.reportId || r.id,
      fileName,
      type: isErrorDetection ? 'error-detection' : 'copied-content',
      typeLabel: isErrorDetection ? 'Error Detection' : 'Copied Content',
      reportType: isErrorDetection ? 'error-detection' : 'copied-content',
      date: created.toISOString().split('T')[0],
      time: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: r.status || 'completed',
      result: resultText,
      reportStatus: 'available',
      detail: detailText,
      documentCount: r.documentCount || (r.documents ? r.documents.length : 1),
      summary: r.summary || {},
      findings: r.findings || [],
      pairResults: r.pairResults || [],
      ...r,
    };
  });
}

async function run() {
  console.log('=== TEST: Reports & History Page Data Contract ===\n');

  // 1. Authenticate as faculty
  const token = await apiLogin('faculty1@example.com', 'Password123!');
  console.log('✓ Logged in as faculty1@example.com');

  // 2. Fetch reports
  const res = await requestJson('/api/reports', token);
  console.log('✓ GET /api/reports status:', res.status);
  console.log('  Reports returned:', res.data?.reports?.length || 0);

  const rawReports = res.data?.reports || [];
  const transformed = transformReports(rawReports);

  console.log(`✓ Successfully transformed ${transformed.length} reports into UI analysis cards.`);

  for (let i = 0; i < transformed.length; i++) {
    const card = transformed[i];
    if (typeof card.fileName !== 'string' || card.fileName.length === 0) {
      throw new Error(`Report #${i} is missing valid fileName: ${JSON.stringify(card)}`);
    }
    if (typeof card.fileName.endsWith !== 'function') {
      throw new Error(`Report #${i} fileName has no endsWith method: ${card.fileName}`);
    }
    if (!card.type || !card.typeLabel) {
      throw new Error(`Report #${i} missing type/typeLabel: ${card.type}`);
    }
    if (!card.date || !card.time) {
      throw new Error(`Report #${i} missing formatted date/time`);
    }
    // Test the exact operation that previously crashed:
    const isZip = card.fileName.endsWith('.zip');
    const displayDate = new Date(card.date).toLocaleDateString('en-US');
    console.log(`  [Card #${i + 1}] "${card.fileName}" (${card.typeLabel}) -> isZip: ${isZip}, date: ${displayDate}, result: ${card.result}`);
  }

  console.log('\n🎉 ALL REPORTS & HISTORY VERIFICATION CHECKS PASSED (100%)!');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
