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
          if (parsed.idToken) {
            resolve(parsed);
          } else {
            reject(new Error(`Login failed for ${email}: ${b}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getMe(token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/users/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
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

function getRoleRedirect(role) {
  const norm = role === 'faculty_researcher' || role === 'faculty' || role === 'researcher' ? 'faculty_researcher' : role;
  if (norm === 'admin') return '/admin/dashboard';
  return '/dashboard';
}

async function verifyAccount(label, email, password, expectedRole, expectedRedirect) {
  console.log(`\n--- Testing ${label} (${email}) ---`);
  const authRes = await apiLogin(email, password);
  console.log(`✓ Firebase Auth Emulator authenticated. localId: ${authRes.localId}`);

  const meRes = await getMe(authRes.idToken);
  console.log(`✓ Backend /api/users/me status: ${meRes.status}`);
  console.log(`  User profile:`, meRes.data?.user);

  const role = meRes.data?.user?.role;
  const redirect = getRoleRedirect(role);
  console.log(`  Resolved Role: ${role} (Expected: ${expectedRole})`);
  console.log(`  Redirect Target: ${redirect} (Expected: ${expectedRedirect})`);

  if (meRes.status !== 200) {
    throw new Error(`Expected HTTP 200 from /api/users/me but got ${meRes.status}: ${JSON.stringify(meRes)}`);
  }
  if (role !== expectedRole) {
    throw new Error(`Role mismatch for ${email}: expected ${expectedRole}, got ${role}`);
  }
  if (redirect !== expectedRedirect) {
    throw new Error(`Redirect mismatch: expected ${expectedRedirect}, got ${redirect}`);
  }
  console.log(`✓ ALL ASSERTIONS PASSED for ${label}`);
}

async function run() {
  console.log('=== VERIFYING TRUSTLENS ROLE-BASED AUTHENTICATION & ROUTING ===');

  await verifyAccount('Admin Demo', 'admin@demo.com', 'Password123!', 'admin', '/admin/dashboard');
  await verifyAccount('Faculty Researcher 1', 'faculty1@example.com', 'Password123!', 'faculty_researcher', '/dashboard');
  await verifyAccount('Faculty Demo', 'faculty@demo.com', 'Password123!', 'faculty_researcher', '/dashboard');
  await verifyAccount('Student Demo', 'student@demo.com', 'password123', 'student', '/dashboard');

  console.log('\n=============================================');
  console.log('🎉 ALL ROLE-BASED TESTS PASSED SUCCESSFULLY!');
  console.log('=============================================');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
