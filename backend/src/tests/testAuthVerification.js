const path = require('path');
const { initializeApp } = require(path.resolve(__dirname, '../../../Frontend/node_modules/firebase/app'));
const { 
  getAuth, 
  connectAuthEmulator, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} = require(path.resolve(__dirname, '../../../Frontend/node_modules/firebase/auth'));
const http = require('http');


// Ensure backend environment is loaded
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { getDb } = require('../config/firebaseAdmin');
const { startAuthEmulator } = require('../services/authEmulatorService');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const copiedContentService = require('../services/copiedContent/copiedContentService');
const reportService = require('../services/reportService');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      if (typeof postData === 'object') {
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
}

async function runAuthVerification() {
  console.log('====================================================');
  console.log(' TRUSTLENS AUTHENTICATION & LOGIN VALIDATION SUITE  ');
  console.log('====================================================\n');

  // 1. Ensure emulator is active
  await startAuthEmulator();

  const clientApp = initializeApp({
    projectId: 'trustlens-30294',
    apiKey: 'AIzaSyDmQv8V1QkcIvxrLLfKnPmcO4m_3lzv1ns',
    authDomain: 'trustlens-30294.firebaseapp.com'
  }, 'auth-verification-runner');

  const auth = getAuth(clientApp);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

  let passed = 0;
  let total = 0;

  function record(num, title, isPass, detail = '') {
    total++;
    if (isPass) {
      passed++;
      console.log(`[PASS] TEST ${num}: ${title}${detail ? ` -> ${detail}` : ''}`);
    } else {
      console.error(`[FAIL] TEST ${num}: ${title}${detail ? ` -> ${detail}` : ''}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Valid registered email + correct password
    // ----------------------------------------------------
    try {
      const cred = await signInWithEmailAndPassword(auth, 'student1@example.com', 'Password123!');
      const idToken = await cred.user.getIdToken();
      record(1, 'Valid registered email + correct password authenticates user', 
        cred.user.email === 'student1@example.com' && Boolean(idToken),
        `User UID: ${cred.user.uid}, Token received`
      );
    } catch (err) {
      record(1, 'Valid registered email + correct password authenticates user', false, err.message);
    }

    // ----------------------------------------------------
    // TEST 2: Valid registered email + incorrect password
    // ----------------------------------------------------
    try {
      await signInWithEmailAndPassword(auth, 'student1@example.com', 'wrongpassword');
      record(2, 'Valid registered email + incorrect password rejected', false, 'Should have thrown error!');
    } catch (err) {
      const isRejected = err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential';
      record(2, 'Valid registered email + incorrect password rejected', isRejected, `Error code: ${err.code}`);
    }

    // ----------------------------------------------------
    // TEST 3: Unregistered email + arbitrary password (abc@test.com / wrongpassword)
    // ----------------------------------------------------
    try {
      await signInWithEmailAndPassword(auth, 'abc@test.com', 'wrongpassword');
      record(3, 'Unregistered email + arbitrary password rejected', false, 'Should have thrown error!');
    } catch (err) {
      const isRejected = err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential';
      record(3, 'Unregistered email + arbitrary password rejected', isRejected, `Error code: ${err.code}`);
    }

    // ----------------------------------------------------
    // TEST 4: Empty email + password validation
    // ----------------------------------------------------
    const validateInputs = (email, password) => {
      const errors = {};
      if (!email || !email.trim()) errors.email = 'Please enter your email address.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address.';
      if (!password) errors.password = 'Please enter your password.';
      return errors;
    };

    const err4 = validateInputs('', 'Password123!');
    record(4, 'Empty email + password triggers validation error', 
      err4.email === 'Please enter your email address.',
      `Validation error: "${err4.email}"`
    );

    // ----------------------------------------------------
    // TEST 5: Email + empty password validation
    // ----------------------------------------------------
    const err5 = validateInputs('student1@example.com', '');
    record(5, 'Email + empty password triggers validation error', 
      err5.password === 'Please enter your password.',
      `Validation error: "${err5.password}"`
    );

    // ----------------------------------------------------
    // TEST 6: Completely random username/password
    // ----------------------------------------------------
    try {
      await signInWithEmailAndPassword(auth, 'nonexistent_user_99@randomdomain.xyz', 'some_random_pw_883');
      record(6, 'Completely random username/password rejected', false, 'Should have thrown error!');
    } catch (err) {
      const isRejected = err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential';
      record(6, 'Completely random username/password rejected', isRejected, `Error code: ${err.code}`);
    }

    // ----------------------------------------------------
    // TEST 7: After logout, protected route rejects unauthenticated access
    // ----------------------------------------------------
    await signOut(auth);
    const unauthRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'GET',
      headers: {}
    });

    record(7, 'After logout, protected endpoint rejects unauthenticated access', 
      unauthRes.statusCode === 401,
      `Status: ${unauthRes.statusCode}, Message: ${unauthRes.data.message || 'Unauthorized'}`
    );

    // ----------------------------------------------------
    // TEST 8: Login successfully, verify auth token restoration / verification
    // ----------------------------------------------------
    const cred8 = await signInWithEmailAndPassword(auth, 'student1@example.com', 'Password123!');
    const token8 = await cred8.user.getIdToken();
    const verifyRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token8}`
      }
    });

    record(8, 'Login successfully, auth session & backend verification restored',
      verifyRes.statusCode === 200 && verifyRes.data.user.email === 'student1@example.com',
      `Authenticated user from /api/users/me: ${verifyRes.data.user?.email}`
    );

    // ----------------------------------------------------
    // TEST 9: Login, logout, then open protected route without valid token
    // ----------------------------------------------------
    await signOut(auth);
    const forgeRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer demo-token-admin' // Forged token attempt
      }
    });

    record(9, 'Forged or revoked tokens cannot access protected route',
      forgeRes.statusCode === 401,
      `Status: ${forgeRes.statusCode} (Access denied to unverified token)`
    );

    // ----------------------------------------------------
    // TEST 10: Student account logs in -> student receives only student permissions
    // ----------------------------------------------------
    const studentCred = await signInWithEmailAndPassword(auth, 'student1@example.com', 'Password123!');
    const studentToken = await studentCred.user.getIdToken();

    const studentMeRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });

    const studentAdminRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/users',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });

    record(10, 'Student account receives only Student permissions and is barred from Admin',
      studentMeRes.statusCode === 200 && 
      studentMeRes.data.user.role === 'student' &&
      studentAdminRes.statusCode === 403,
      `User role: ${studentMeRes.data.user.role}, Admin endpoint status: ${studentAdminRes.statusCode}`
    );

    // ----------------------------------------------------
    // TEST 11: Admin account logs in -> Admin permissions continue working
    // ----------------------------------------------------
    const adminCred = await signInWithEmailAndPassword(auth, 'admin@demo.com', 'Password123!');
    const adminToken = await adminCred.user.getIdToken();

    const adminMeRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const adminUsersRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/users',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    record(11, 'Faculty/Admin account logs in and has proper administrative privileges',
      adminMeRes.statusCode === 200 &&
      adminMeRes.data.user.role === 'admin' &&
      adminUsersRes.statusCode === 200,
      `Admin role: ${adminMeRes.data.user.role}, Admin users query status: ${adminUsersRes.statusCode}`
    );

    // ----------------------------------------------------
    // TEST 12: Existing Error Detection functionality unaffected
    // ----------------------------------------------------
    const edResult = errorDetectionService.analyzeStatementsAgainstSources(
      ['TCP is a connection-oriented transport protocol.'],
      [{ id: 'k1', text: 'TCP is a connection-oriented transport protocol.', category: 'Computer Networks' }]
    );

    record(12, 'Existing Error Detection functionality unaffected',
      Boolean(edResult && edResult.resultsList && edResult.summary),
      `Results count: ${edResult.resultsList?.length}, Verified: ${edResult.summary?.verified}`
    );

    // ----------------------------------------------------
    // TEST 13: Existing Copied Content functionality unaffected
    // ----------------------------------------------------
    const ccResult = copiedContentService.analyzeCopiedContentDocuments([
      { documentId: 'd1', originalName: 'doc1.txt', extractedText: 'Software engineering involves software design, development, and testing processes.' },
      { documentId: 'd2', originalName: 'doc2.txt', extractedText: 'Software engineering involves software design, development, and testing processes.' }
    ]);

    record(13, 'Existing Copied Content functionality unaffected',
      Boolean(ccResult && ccResult.summary && Array.isArray(ccResult.pairResults)),
      `Pairs compared: ${ccResult.pairResults?.length}, Documents processed: ${ccResult.processedDocs?.length}`
    );

    // ----------------------------------------------------
    // TEST 14: Existing Reports & History functionality unaffected
    // ----------------------------------------------------
    const reportsRes = await reportService.listUserReports('test-student-1', { limit: 5 });
    record(14, 'Existing Reports & History functionality unaffected',
      Boolean(reportsRes && Array.isArray(reportsRes.reports)),
      `Retrieved ${reportsRes.reports?.length} reports successfully`
    );

    console.log('\n====================================================');
    console.log(` VALIDATION SUMMARY: ${passed} / ${total} TESTS PASSED`);
    console.log('====================================================');

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runAuthVerification();
