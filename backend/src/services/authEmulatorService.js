const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUTH_PORT = 9099;
const AUTH_HOST = '0.0.0.0';
const PROJECT_ID = 'trustlens-30294';
const USERS_FILE = path.resolve(__dirname, '../config/authUsers.json');

let server = null;
let usersStore = {};

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function verifyPassword(password, salt, hash) {
  try {
    const testHash = hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(testHash), Buffer.from(hash));
  } catch {
    return false;
  }
}

function createJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
}

function generateTokens(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    aud: PROJECT_ID,
    auth_time: now,
    user_id: user.uid,
    sub: user.uid,
    iat: now,
    exp: now + 3600,
    email: user.email,
    email_verified: true,
    firebase: {
      identities: {
        email: [user.email]
      },
      sign_in_provider: 'password'
    }
  };

  const idToken = createJwt(payload);
  const refreshToken = crypto.randomBytes(32).toString('hex');
  user.refreshToken = refreshToken;

  return {
    idToken,
    refreshToken,
    expiresIn: '3600',
    localId: user.uid,
    email: user.email,
    registered: true
  };
}

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      usersStore = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('[AuthEmulator] Failed reading users file, resetting store:', err.message);
    usersStore = {};
  }

  // Pre-seed default test users matching existing Firestore records if not already present
  const defaultAccounts = [
    {
      uid: 'admin-demo-1',
      email: 'admin@demo.com',
      password: 'Password123!',
      displayName: 'Admin Demo',
      role: 'admin'
    },
    {
      uid: 'admin-trustlens-1',
      email: 'admin@trustlens.edu',
      password: 'Admin@1234',
      displayName: 'TrustLens Administrator',
      role: 'admin'
    },
    {
      uid: 'test-student-1',
      email: 'student1@example.com',
      password: 'Password123!',
      displayName: 'Student One',
      role: 'student'
    },
    {
      uid: 'test-faculty-1',
      email: 'faculty1@example.com',
      password: 'Password123!',
      displayName: 'Faculty Researcher One',
      role: 'faculty_researcher'
    },
    {
      uid: 'demo-faculty-default',
      email: 'faculty@demo.com',
      password: 'Password123!',
      displayName: 'Demo Faculty',
      role: 'faculty_researcher'
    },
    {
      uid: 'demo-student-default',
      email: 'student@demo.com',
      password: 'password123',
      displayName: 'Demo Student',
      role: 'student'
    }
  ];

  let modified = false;
  for (const acc of defaultAccounts) {
    const normEmail = acc.email.toLowerCase();
    if (!usersStore[normEmail]) {
      const salt = crypto.randomBytes(16).toString('hex');
      usersStore[normEmail] = {
        uid: acc.uid,
        email: acc.email,
        salt,
        passwordHash: hashPassword(acc.password, salt),
        displayName: acc.displayName,
        role: acc.role,
        createdAt: new Date().toISOString()
      };
      modified = true;
    } else if (!usersStore[normEmail].role && acc.role) {
      usersStore[normEmail].role = acc.role;
      modified = true;
    }
  }

  if (modified) {
    saveUsers();
  }
}

function getUserByUidOrEmail(uid, email) {
  loadUsers();
  if (email) {
    const byEmail = usersStore[email.toLowerCase().trim()];
    if (byEmail) return byEmail;
  }
  if (uid) {
    const byUid = Object.values(usersStore).find(u => u.uid === uid);
    if (byUid) return byUid;
  }
  return null;
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersStore, null, 2), 'utf8');
  } catch (err) {
    console.error('[AuthEmulator] Failed saving users store:', err.message);
  }
}

function sendJson(res, statusCode, data, req = null) {
  const origin = (req && req.headers && req.headers.origin) ? req.headers.origin : '*';
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Private-Network': 'true',
    'Access-Control-Allow-Credentials': 'true'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message, errors = null, req = null) {
  sendJson(res, statusCode, {
    error: {
      code: statusCode,
      message: message,
      errors: errors || [{ message, domain: 'global', reason: 'invalid' }]
    }
  }, req);
}

function handleRequest(req, res) {
  const origin = req.headers.origin || '*';
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    const requestedHeaders = req.headers['access-control-request-headers'] || '*';
    res.writeHead(200, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': requestedHeaders,
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let data = {};
    if (body) {
      try {
        data = JSON.parse(body);
      } catch {
        // May be form encoded for token refresh
        const params = new URLSearchParams(body);
        data = Object.fromEntries(params.entries());
      }
    }

    const url = req.url || '';

    // 1. Sign In with Password: accounts:signInWithPassword
    if (url.includes('accounts:signInWithPassword')) {
      const email = (data.email || '').trim().toLowerCase();
      const password = data.password || '';

      if (!email) {
        return sendError(res, 400, 'MISSING_EMAIL', null, req);
      }
      if (!password) {
        return sendError(res, 400, 'MISSING_PASSWORD', null, req);
      }

      const user = usersStore[email];
      if (!user) {
        return sendError(res, 400, 'EMAIL_NOT_FOUND', null, req);
      }

      if (!verifyPassword(password, user.salt, user.passwordHash)) {
        return sendError(res, 400, 'INVALID_PASSWORD', null, req);
      }

      const tokenData = generateTokens(user);
      return sendJson(res, 200, tokenData, req);
    }

    // 2. Sign Up: accounts:signUp
    if (url.includes('accounts:signUp')) {
      const email = (data.email || '').trim().toLowerCase();
      const password = data.password || '';

      if (!email) {
        return sendError(res, 400, 'MISSING_EMAIL', null, req);
      }
      if (!password || password.length < 6) {
        return sendError(res, 400, 'WEAK_PASSWORD', null, req);
      }

      if (usersStore[email]) {
        return sendError(res, 400, 'EMAIL_EXISTS', null, req);
      }

      const uid = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const salt = crypto.randomBytes(16).toString('hex');
      const newUser = {
        uid,
        email: data.email.trim(),
        salt,
        passwordHash: hashPassword(password, salt),
        displayName: data.displayName || data.email.split('@')[0],
        createdAt: new Date().toISOString()
      };

      usersStore[email] = newUser;
      saveUsers();

      const tokenData = generateTokens(newUser);
      return sendJson(res, 200, tokenData, req);
    }

    // 3. User Lookup: accounts:lookup (client and admin SDK)
    if (url.includes('accounts:lookup')) {
      const localIds = data.localId || [];
      const idToken = data.idToken;

      let matchedUsers = [];

      if (idToken) {
        try {
          const parts = idToken.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            const uid = payload.sub || payload.user_id;
            const found = Object.values(usersStore).find(u => u.uid === uid);
            if (found) matchedUsers.push(found);
          }
        } catch {
          // ignore parsing error
        }
      }

      if (localIds.length > 0) {
        for (const lid of localIds) {
          const found = Object.values(usersStore).find(u => u.uid === lid);
          if (found && !matchedUsers.some(m => m.uid === found.uid)) {
            matchedUsers.push(found);
          }
        }
      }

      if (matchedUsers.length === 0 && idToken) {
        return sendError(res, 400, 'USER_NOT_FOUND', null, req);
      }

      return sendJson(res, 200, {
        users: matchedUsers.map(u => ({
          localId: u.uid,
          email: u.email,
          displayName: u.displayName || u.email.split('@')[0],
          emailVerified: true,
          passwordUpdatedAt: Date.now(),
          validSince: '0'
        }))
      }, req);
    }

    // 4. Token Refresh: securetoken.googleapis.com/v1/token
    if (url.includes('securetoken.googleapis.com') || url.includes('/v1/token')) {
      const refreshToken = data.refresh_token || data.refreshToken;
      const user = Object.values(usersStore).find(u => u.refreshToken === refreshToken);

      if (!user) {
        return sendError(res, 400, 'INVALID_REFRESH_TOKEN', null, req);
      }

      const tokens = generateTokens(user);
      return sendJson(res, 200, {
        access_token: tokens.idToken,
        expires_in: '3600',
        token_type: 'Bearer',
        refresh_token: tokens.refreshToken,
        id_token: tokens.idToken,
        user_id: user.uid,
        project_id: PROJECT_ID
      }, req);
    }

    // 5. Send Oob Code (Password Reset): accounts:sendOobCode
    if (url.includes('accounts:sendOobCode')) {
      const email = (data.email || '').trim().toLowerCase();
      if (!email) {
        return sendError(res, 400, 'MISSING_EMAIL', null, req);
      }
      const user = usersStore[email];
      if (!user) {
        return sendError(res, 400, 'EMAIL_NOT_FOUND', null, req);
      }
      const oobCode = `reset_${crypto.randomBytes(16).toString('hex')}`;
      user.resetToken = oobCode;
      saveUsers();
      return sendJson(res, 200, { email: user.email, oobCode }, req);
    }

    // 6. Reset Password: accounts:resetPassword
    if (url.includes('accounts:resetPassword')) {
      const { oobCode, newPassword } = data;
      if (!newPassword || newPassword.length < 6) {
        return sendError(res, 400, 'WEAK_PASSWORD', null, req);
      }
      const user = Object.values(usersStore).find(u => u.resetToken === oobCode);
      if (!user) {
        return sendError(res, 400, 'INVALID_OOB_CODE', null, req);
      }
      const salt = crypto.randomBytes(16).toString('hex');
      user.salt = salt;
      user.passwordHash = hashPassword(newPassword, salt);
      delete user.resetToken;
      saveUsers();
      return sendJson(res, 200, { email: user.email, requestType: 'PASSWORD_RESET' }, req);
    }

    // Default fallback: 404
    sendError(res, 404, 'NOT_FOUND', null, req);
  });
}

function startAuthEmulator() {
  if (server) return Promise.resolve();

  loadUsers();

  return new Promise((resolve, reject) => {
    server = http.createServer(handleRequest);

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[AuthEmulator] Port ${AUTH_PORT} is already in use. Assuming emulator running.`);
        resolve();
      } else {
        console.error('[AuthEmulator] Server error:', err.message);
        reject(err);
      }
    });

    server.listen(AUTH_PORT, () => {
      console.log(`[AuthEmulator] Firebase Auth Emulator listening on port ${AUTH_PORT} (dual stack IPv4/IPv6)`);
      process.env.FIREBASE_AUTH_EMULATOR_HOST = `127.0.0.1:${AUTH_PORT}`;
      resolve();
    });
  });
}

function stopAuthEmulator() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

function updateUserPassword(email, newPassword) {
  loadUsers();
  const normEmail = (email || '').trim().toLowerCase();
  const user = usersStore[normEmail];
  if (!user) {
    return { success: false, message: 'User not found.' };
  }
  const salt = crypto.randomBytes(16).toString('hex');
  user.salt = salt;
  user.passwordHash = hashPassword(newPassword, salt);
  delete user.resetToken;
  saveUsers();
  return { success: true, user };
}

function userExists(email) {
  loadUsers();
  const normEmail = (email || '').trim().toLowerCase();
  return !!usersStore[normEmail];
}

module.exports = {
  startAuthEmulator,
  stopAuthEmulator,
  updateUserPassword,
  userExists,
  getUserByUidOrEmail,
  AUTH_PORT,
  AUTH_HOST
};
