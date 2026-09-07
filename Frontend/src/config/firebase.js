import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'trustlens-30294',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDmQv8V1QkcIvxrLLfKnPmcO4m_3lzv1ns',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'trustlens-30294.firebaseapp.com',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'trustlens-30294.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '351958324459',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:351958324459:web:77845096b26b993e761aae',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Connect to local Firebase Auth Emulator if host is configured
// Dynamically match browser hostname to eliminate cross-host origin/PNA mismatch
const getEmulatorHost = () => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `${window.location.hostname}:9099`;
  }
  return import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
};

const emulatorHost = getEmulatorHost();
if (emulatorHost && !auth.emulatorConfig) {
  try {
    connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
  } catch (err) {
    console.warn('[Firebase] Auth emulator connection note:', err.message);
  }
}

export default app;

