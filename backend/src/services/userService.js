const { FieldValue } = require('firebase-admin/firestore');
const { getDb, isFirebaseInitialized } = require('../config/firebaseAdmin');

const ALLOWED_PUBLIC_ROLES = ['student', 'faculty', 'researcher'];
const ALL_VALID_ROLES = ['student', 'faculty', 'researcher', 'admin'];

/**
 * Creates a new user profile document in Firestore users/{uid}
 */
async function createUserProfile(uid, email, { name, role }) {
  if (!isFirebaseInitialized()) {
    throw new Error('Database is not initialized');
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    const err = new Error('Name is required');
    err.statusCode = 400;
    throw err;
  }
  if (!role || !ALLOWED_PUBLIC_ROLES.includes(role)) {
    const err = new Error(`Invalid role. Public profile creation permits: ${ALLOWED_PUBLIC_ROLES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const db = getDb();
  const userRef = db.collection('users').doc(uid);
  const doc = await userRef.get();

  if (doc.exists) {
    const err = new Error('User profile already exists');
    err.statusCode = 409;
    throw err;
  }

  const now = FieldValue.serverTimestamp();
  const userDoc = {
    uid,
    name: name.trim(),
    email,
    role,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await userRef.set(userDoc);

  // Log user registration activity safely (non-blocking)
  try {
    const { logActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } = require('./activityService');
    await logActivity({
      action: ACTIVITY_ACTIONS.USER_REGISTERED,
      category: ACTIVITY_CATEGORIES.USER,
      message: `A new ${role} account (${name.trim()}) was registered.`,
      actorId: uid,
      targetId: uid,
      user: name.trim(),
      userName: name.trim(),
      role: role,
      status: 'completed',
      metadata: { role, email },
    });
  } catch (logErr) {
    console.error('[UserService] Activity log failed during registration:', logErr.message);
  }

  return {
    uid,
    name: name.trim(),
    email,
    role,
    status: 'active',
  };
}

/**
 * Retrieves user profile from Firestore users/{uid}
 */
async function getUserProfile(uid) {
  if (!isFirebaseInitialized()) {
    return null;
  }

  const db = getDb();
  const doc = await db.collection('users').doc(uid).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  return {
    uid: data.uid,
    name: data.name,
    email: data.email,
    role: data.role,
    status: data.status || 'active',
  };
}

/**
 * Updates editable fields (name) for users/{uid}
 */
async function updateUserProfile(uid, { name }) {
  if (!isFirebaseInitialized()) {
    throw new Error('Database is not initialized');
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    const err = new Error('Name is required');
    err.statusCode = 400;
    throw err;
  }

  const db = getDb();
  const userRef = db.collection('users').doc(uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    const err = new Error('User profile not found');
    err.statusCode = 404;
    throw err;
  }

  await userRef.update({
    name: name.trim(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedDoc = await userRef.get();
  const data = updatedDoc.data();

  return {
    uid: data.uid,
    name: data.name,
    email: data.email,
    role: data.role,
    status: data.status || 'active',
  };
}

module.exports = {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  ALLOWED_PUBLIC_ROLES,
  ALL_VALID_ROLES,
};
