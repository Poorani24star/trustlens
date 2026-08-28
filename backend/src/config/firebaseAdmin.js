const admin = require('firebase-admin');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

let db = null;
let isInitialized = false;
let initError = null;

function initializeFirebase() {
  if (getApps().length > 0) {
    isInitialized = true;
    db = getFirestore();
    return;
  }

  try {
    let credential = null;

    // Option 1: Check environment variable or scan config/backend folders for service account JSON
    const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const defaultPaths = [
      envPath ? path.resolve(envPath) : null,
      path.resolve(__dirname, 'serviceAccountKey.json'),
      path.resolve(__dirname, '../../serviceAccountKey.json'),
    ].filter(Boolean);

    let keyFilePath = defaultPaths.find(p => fs.existsSync(p));

    // Dynamic search if specific file not found yet
    if (!keyFilePath) {
      const searchDirs = [__dirname, path.resolve(__dirname, '../..')];
      for (const dir of searchDirs) {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'package.json' && f !== 'package-lock.json');
          for (const file of files) {
            const fp = path.join(dir, file);
            try {
              const content = JSON.parse(fs.readFileSync(fp, 'utf8'));
              if (content && (content.type === 'service_account' || content.private_key)) {
                keyFilePath = fp;
                break;
              }
            } catch (e) {
              // ignore non-json or unreadable files
            }
          }
        }
        if (keyFilePath) break;
      }
    }

    if (keyFilePath) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
      credential = cert(serviceAccount);
      console.log(`[Firebase Admin] Loaded service account from ${path.basename(keyFilePath)}`);
    } 
    // Option 2: Check individual environment variables
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      credential = cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      });
    }

    if (credential) {
      initializeApp({
        credential,
      });
      db = getFirestore();
      isInitialized = true;
      console.log('[Firebase Admin] Firebase Admin SDK initialized successfully.');
    } else {
      initError = 'Firebase credentials not found. Provide serviceAccountKey.json or set FIREBASE_* environment variables.';
      console.warn('[Firebase Admin] Warning: ' + initError);
    }
  } catch (err) {
    initError = err.message;
    console.error('[Firebase Admin] Error initializing Firebase Admin SDK:', err.message);
  }
}

// Attempt initialization
initializeFirebase();

module.exports = {
  admin,
  getDb: () => db,
  isFirebaseInitialized: () => isInitialized,
  getInitError: () => initError,
};
