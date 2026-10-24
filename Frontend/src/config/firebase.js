
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || 'trustlens-30294',

  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyDmQv8V1QkcIvxrLLfKnPmcO4m_3lzv1ns',

  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    'trustlens-30294.firebaseapp.com',

  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    'trustlens-30294.firebasestorage.app',

  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '351958324459',

  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    '1:351958324459:web:77845096b26b993e761aae',
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Connect to the Auth Emulator only when explicitly enabled
// during local development. Production uses real Firebase Authentication.
if (
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true'
) {
  const emulatorHost =
    import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

  connectAuthEmulator(auth, `http://${emulatorHost}`, {
    disableWarnings: true,
  });
}

export default app;
