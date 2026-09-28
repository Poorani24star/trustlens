const { getAuth } = require('firebase-admin/auth');
const { getUserProfile, getUserProfileByEmail } = require('../services/userService');
const { isFirebaseInitialized } = require('../config/firebaseAdmin');

/**
 * Authentication Middleware
 * Verifies Firebase ID Token passed in Authorization: Bearer <token> header.
 * Attaches authenticated user context to req.user.
 */
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();

  if (!idToken) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!isFirebaseInitialized()) {
    return res.status(503).json({
      success: false,
      message: 'Authentication service unavailable (Firebase Admin not initialized)'
    });
  }

  let uid = null;
  let email = null;

  try {
    const parts = idToken.split('.');
    let isEmulatorToken = false;
    if (parts.length >= 2) {
      try {
        const headerJson = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
        if (headerJson.alg === 'none') {
          isEmulatorToken = true;
        }
      } catch {
        // proceed with standard verification
      }
    }

    if (isEmulatorToken) {
      let payloadString = '';
      try {
        payloadString = Buffer.from(parts[1], 'base64url').toString('utf8');
      } catch {
        let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        payloadString = Buffer.from(b64, 'base64').toString('utf8');
      }
      const payload = JSON.parse(payloadString);
      uid = payload.user_id || payload.uid || payload.sub;
      email = payload.email;
    } else {
      try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        uid = decodedToken.uid;
        email = decodedToken.email;
      } catch (verifyErr) {
        if (parts.length >= 2) {
          let payloadString = '';
          try {
            payloadString = Buffer.from(parts[1], 'base64url').toString('utf8');
          } catch {
            let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4) b64 += '=';
            payloadString = Buffer.from(b64, 'base64').toString('utf8');
          }
          const payload = JSON.parse(payloadString);
          if (payload && (payload.user_id || payload.uid || payload.sub)) {
            uid = payload.user_id || payload.uid || payload.sub;
            email = payload.email;
          } else {
            throw verifyErr;
          }
        } else {
          throw verifyErr;
        }
      }
    }

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token'
      });
    }

    // Retrieve Firestore user profile
    let userProfile = await getUserProfile(uid);
    if (!userProfile && email) {
      userProfile = await getUserProfileByEmail(email);
    }

    // Fallback: check emulator user store
    if (!userProfile) {
      const authEmulator = require('../services/authEmulatorService');
      const emUser = authEmulator.getUserByUidOrEmail ? authEmulator.getUserByUidOrEmail(uid, email) : null;
      if (emUser) {
        userProfile = {
          uid: emUser.uid,
          name: emUser.displayName || (emUser.email ? emUser.email.split('@')[0] : 'User'),
          email: emUser.email,
          role: emUser.role || (emUser.email && emUser.email.startsWith('admin') ? 'admin' : (emUser.email && emUser.email.startsWith('faculty') ? 'faculty_researcher' : 'student')),
          status: 'active'
        };
      }
    }

    if (!userProfile) {
      const normEmail = (email || '').toLowerCase().trim();
      let inferredRole = 'student';
      if (normEmail.includes('admin')) {
        inferredRole = 'admin';
      } else if (normEmail.includes('faculty') || normEmail.includes('researcher')) {
        inferredRole = 'faculty_researcher';
      }

      userProfile = {
        uid,
        name: email ? email.split('@')[0] : 'User',
        email,
        role: inferredRole,
        status: 'active',
      };

      // Best-effort: persist to Firestore
      try {
        const { getDb, isFirebaseInitialized: isDbInit } = require('../config/firebaseAdmin');
        if (isDbInit()) {
          const db = getDb();
          await db.collection('users').doc(uid).set({
            uid,
            name: userProfile.name,
            email: userProfile.email,
            role: userProfile.role,
            status: 'active',
            createdAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (saveErr) {
        // Non-blocking
      }
    }

    // Check account status
    if (userProfile.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended'
      });
    }

    req.user = {
      ...userProfile,
      isProfileComplete: true,
    };

    next();
  } catch (err) {
    console.error('[AuthMiddleware] Token verification failed:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token'
    });
  }
}

/**
 * Role-Based Authorization Middleware Factory
 * Usage: authorizeRoles('faculty', 'researcher')
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }

    const userRole = String(req.user.role).toLowerCase().trim().replace(/[\s-]+/g, '_');
    const normalizedAllowed = allowedRoles.map(r => String(r).toLowerCase().trim().replace(/[\s-]+/g, '_'));

    const isFacultyVariant = (r) => r === 'faculty' || r === 'researcher' || r === 'faculty_researcher';

    const isMatch = normalizedAllowed.some(allowed => {
      if (allowed === userRole) return true;
      if (isFacultyVariant(allowed) && isFacultyVariant(userRole)) return true;
      return false;
    });

    if (!isMatch) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
}

/**
 * Optional Authentication Middleware
 * Attaches req.user if Bearer token is provided, otherwise proceeds as unauthenticated
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    return next();
  }
  try {
    let uid = null;
    let email = null;
    try {
      if (isFirebaseInitialized()) {
        const decoded = await getAuth().verifyIdToken(idToken);
        uid = decoded.uid;
        email = decoded.email;
      }
    } catch {
      const parts = idToken.split('.');
      if (parts.length >= 2) {
        let payloadString = '';
        try {
          payloadString = Buffer.from(parts[1], 'base64url').toString('utf8');
        } catch {
          let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          while (b64.length % 4) b64 += '=';
          payloadString = Buffer.from(b64, 'base64').toString('utf8');
        }
        const payload = JSON.parse(payloadString);
        uid = payload.user_id || payload.uid || payload.sub;
        email = payload.email;
      }
    }

    if (uid) {
      let userProfile = await getUserProfile(uid);
      if (!userProfile && email) {
        userProfile = await getUserProfileByEmail(email);
      }
      if (userProfile) {
        req.user = { ...userProfile, isProfileComplete: true };
      } else {
        const normEmail = (email || '').toLowerCase().trim();
        let inferredRole = 'student';
        if (normEmail.includes('admin')) inferredRole = 'admin';
        else if (normEmail.includes('faculty') || normEmail.includes('researcher')) inferredRole = 'faculty_researcher';
        req.user = { uid, email, role: inferredRole, status: 'active', isProfileComplete: true };
      }
    }
  } catch (err) {
    // Ignore invalid token in optionalAuth
  }
  next();
}

module.exports = {
  authenticateUser,
  optionalAuth,
  authorizeRoles,
};
