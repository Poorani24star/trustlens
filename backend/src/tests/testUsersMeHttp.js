const http = require('http');

function loginAndGetProfile(email, password) {
  return new Promise((resolve, reject) => {
    // 1. Sign in to auth emulator
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9099,
      path: '/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        const authData = JSON.parse(b);
        if (!authData.idToken) return reject(new Error('No token: ' + b));

        // 2. Call backend /api/users/me with token
        const req2 = http.request({
          hostname: '127.0.0.1',
          port: 5000,
          path: '/api/users/me',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authData.idToken}`
          }
        }, (res2) => {
          let b2 = '';
          res2.on('data', c => b2 += c);
          res2.on('end', () => {
            try {
              resolve({ statusCode: res2.statusCode, data: JSON.parse(b2) });
            } catch (e) {
              resolve({ statusCode: res2.statusCode, raw: b2 });
            }
          });
        });
        req2.on('error', reject);
        req2.end();
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ email, password }));
    req.end();
  });
}

async function main() {
  console.log('Testing /api/users/me over HTTP:\n');
  const admin = await loginAndGetProfile('admin@demo.com', 'Password123!');
  console.log('Admin:', admin.statusCode, admin.data);

  const faculty = await loginAndGetProfile('faculty1@example.com', 'Password123!');
  console.log('Faculty:', faculty.statusCode, faculty.data);

  const student = await loginAndGetProfile('student@demo.com', 'password123');
  console.log('Student:', student.statusCode, student.data);
}

main().catch(console.error);
