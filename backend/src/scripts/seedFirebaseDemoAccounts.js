require('dotenv').config();

const { admin, getDb, isFirebaseInitialized } = require('../config/firebaseAdmin');

const accounts = [
  {
    email: process.env.DEMO_STUDENT_EMAIL || 'student@demo.com',
    password: process.env.DEMO_STUDENT_PASSWORD,
    displayName: 'Demo Student',
    role: 'student',
  },
  {
    email: process.env.DEMO_FACULTY_EMAIL || 'faculty1@example.com',
    password: process.env.DEMO_FACULTY_PASSWORD,
    displayName: 'Faculty Researcher One',
    role: 'faculty_researcher',
  },
  {
    email: process.env.DEMO_ADMIN_EMAIL || 'admin@demo.com',
    password: process.env.DEMO_ADMIN_PASSWORD,
    displayName: 'Admin Demo',
    role: 'admin',
  },
];

async function seedAccount(account) {
  if (!account.password) {
    throw new Error(`Missing password environment variable for ${account.email}`);
  }

  let user;
  try {
    user = await admin.auth().getUserByEmail(account.email);
    user = await admin.auth().updateUser(user.uid, {
      displayName: account.displayName,
      password: account.password,
    });
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    user = await admin.auth().createUser({
      email: account.email,
      password: account.password,
      displayName: account.displayName,
      emailVerified: true,
    });
  }

  const profileRef = getDb().collection('users').doc(user.uid);
  const profile = await profileRef.get();
  if (!profile.exists) {
    const now = admin.firestore.FieldValue.serverTimestamp();
    await profileRef.set({
      uid: user.uid,
      name: account.displayName,
      email: user.email,
      role: account.role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log(`Seeded Firebase Auth account ${account.email} (${account.role})`);
}

async function main() {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase Admin is not initialized. Configure service-account credentials first.');
  }
  for (const account of accounts) await seedAccount(account);
}

main().catch((err) => {
  console.error('[Demo seed] Failed:', err.message);
  process.exitCode = 1;
});
