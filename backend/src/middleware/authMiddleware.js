const { getAuth } = require('firebase-admin/auth');
const { getUserProfile } = require('../services/userService');
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

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const { uid, email } = decodedToken;

    // Retrieve Firestore user profile
    const userProfile = await getUserProfile(uid);

    if (!userProfile) {
      // Profile not created yet in Firestore (initial signup phase)
      req.user = {
        uid,
        email,
        role: null,
        status: 'active',
        isProfileComplete: false,
      };
      return next();
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
  if (!idToken || !isFirebaseInitialized()) {
    return next();
  }
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const { uid, email } = decodedToken;
    const userProfile = await getUserProfile(uid);
    if (userProfile) {
      req.user = { ...userProfile, isProfileComplete: true };
    } else {
      req.user = { uid, email, role: null, status: 'active', isProfileComplete: false };
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
