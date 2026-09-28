const http = require('http');

function makeRequest({ hostname = 'localhost', port = 5000, path, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (dataString) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request({ hostname, port, path, method, headers: reqHeaders }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        let parsed = responseBody;
        try { parsed = JSON.parse(responseBody); } catch {}
        resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed });
      });
    });

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log(' TRUSTLENS: FORGOT & RESET PASSWORD TEST SUITE      ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function record(n, desc, isOk, detail) {
    if (isOk) {
      console.log(`[PASS] TEST ${n}: ${desc} -> ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] TEST ${n}: ${desc} -> ${detail}`);
      failed++;
    }
  }

  try {
    // 1. Forgot password empty email
    const t1 = await makeRequest({
      path: '/api/users/forgot-password',
      method: 'POST',
      body: { email: '' }
    });
    record(1, 'Empty email rejected on forgot-password', t1.statusCode === 400 && t1.data.message.includes('email'), t1.data.message);

    // 2. Forgot password unregistered email
    const t2 = await makeRequest({
      path: '/api/users/forgot-password',
      method: 'POST',
      body: { email: 'unknown_user_test@domain.com' }
    });
    record(2, 'Unregistered email returns 404', t2.statusCode === 404, t2.data.message);

    // 3. Forgot password valid registered email
    const t3 = await makeRequest({
      path: '/api/users/forgot-password',
      method: 'POST',
      body: { email: 'student@demo.com' }
    });
    record(3, 'Registered email receives reset instructions', t3.statusCode === 200 && t3.data.success === true, t3.data.message);

    // 4. Reset password weak password
    const t4 = await makeRequest({
      path: '/api/users/reset-password',
      method: 'POST',
      body: { email: 'student@demo.com', newPassword: 'short', confirmPassword: 'short' }
    });
    record(4, 'Weak password rejected', t4.statusCode === 400, t4.data.message);

    // 5. Reset password mismatched passwords
    const t5 = await makeRequest({
      path: '/api/users/reset-password',
      method: 'POST',
      body: { email: 'student@demo.com', newPassword: 'NewPassword123!', confirmPassword: 'DifferentPassword123!' }
    });
    record(5, 'Mismatched passwords rejected', t5.statusCode === 400, t5.data.message);

    // 6. Reset password valid new password
    const t6 = await makeRequest({
      path: '/api/users/reset-password',
      method: 'POST',
      body: { email: 'student@demo.com', newPassword: 'UpdatedSecret123!', confirmPassword: 'UpdatedSecret123!' }
    });
    record(6, 'Valid password reset updates credentials', t6.statusCode === 200 && t6.data.success === true, t6.data.message);

    // 7. Verify new password works in emulator
    const emulatorAuthNew = await makeRequest({
      port: 9099,
      path: '/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',
      method: 'POST',
      body: { email: 'student@demo.com', password: 'UpdatedSecret123!' }
    });
    record(7, 'Login with new updated password succeeds', emulatorAuthNew.statusCode === 200 && emulatorAuthNew.data.idToken, `Token: ${emulatorAuthNew.data.idToken?.slice(0, 25)}...`);

    // 8. Verify old password is now rejected
    const emulatorAuthOld = await makeRequest({
      port: 9099,
      path: '/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',
      method: 'POST',
      body: { email: 'student@demo.com', password: 'password123' }
    });
    record(8, 'Login with previous password fails', emulatorAuthOld.statusCode === 400, `Error: ${emulatorAuthOld.data.error?.message}`);

    // Restore original demo password so other test suites stay consistent
    await makeRequest({
      path: '/api/users/reset-password',
      method: 'POST',
      body: { email: 'student@demo.com', newPassword: 'password123', confirmPassword: 'password123' }
    });
    console.log('\n[INFO] Restored student@demo.com password back to password123 for default demo runs.');

    console.log('\n====================================================');
    console.log(` FORGOT PASSWORD RESULTS: ${passed} / ${passed + failed} TESTS PASSED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
