const { authenticateUser } = require('../middleware/authMiddleware');
const http = require('http');

async function testAccount(email, password) {
  const token = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9099,
      path: '/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(b);
          resolve(parsed.idToken);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ email, password }));
    req.end();
  });

  const req = {
    headers: { authorization: `Bearer ${token}` }
  };
  let userResult = null;
  const res = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(d) { console.log('ERROR RESPONSE:', this.statusCode, d); }
  };

  await authenticateUser(req, res, () => {
    userResult = req.user;
  });

  console.log(`Email: ${email} -> UID: ${userResult?.uid}, Role: ${userResult?.role}`);
}

async function test() {
  await testAccount('admin@demo.com', 'Password123!');
  await testAccount('faculty1@example.com', 'Password123!');
  await testAccount('student@demo.com', 'password123');
}

test().catch(console.error);
