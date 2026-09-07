import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { apiRequest } from './apiClient';
import { normalizeRole } from '../config/rolePermissions';

const SESSION_KEY = 'trustlens_user';

export function getRoleRedirect(role) {
  const norm = normalizeRole(role);
  if (norm === 'admin') return '/admin/dashboard';
  return '/dashboard';
}

export function getStoredUser() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Fetch current user profile from backend /api/users/me
 */
export async function getCurrentUserProfile() {
  try {
    const res = await apiRequest('/users/me');
    if (res && res.success && res.user) {
      setStoredUser(res.user);
      return res.user;
    }
  } catch (err) {
    if (err.isSuspended) {
      throw err;
    }
    console.warn('[AuthService] Backend profile fetch notice:', err.message);
  }
  return getStoredUser();
}

/**
 * Login using Firebase Auth & backend profile retrieval.
 * Strictly verifies credentials against Firebase Authentication.
 */
export async function login(email, password) {
  const trimmedEmail = (email || '').trim();

  // Validate form input before sending request
  if (!trimmedEmail) {
    throw new Error('Please enter your email address.');
  }
  if (!password) {
    throw new Error('Please enter your password.');
  }

  try {
    // 1. Authenticate with Firebase Auth
    const credential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
    const user = credential.user;

    // 2. Fetch authenticated user profile from backend Firestore
    let backendUser = null;
    try {
      backendUser = await getCurrentUserProfile();
    } catch (err) {
      if (err.isSuspended) {
        await firebaseSignOut(auth);
        setStoredUser(null);
        throw new Error('Your account has been suspended. Please contact an administrator.');
      }
    }

    if (backendUser) {
      if (backendUser.status === 'suspended') {
        await firebaseSignOut(auth);
        setStoredUser(null);
        throw new Error('Your account has been suspended. Please contact an administrator.');
      }
      setStoredUser(backendUser);
      return backendUser;
    }

    // 3. Fallback safe profile if user profile not yet created in Firestore
    const safeUser = {
      uid: user.uid,
      name: user.displayName || trimmedEmail.split('@')[0],
      email: user.email,
      role: 'student', // Safe default: never infer admin privileges from email string
      status: 'active',
    };

    // Attempt to register initial profile in Firestore
    try {
      await apiRequest('/users/profile', {
        method: 'POST',
        body: JSON.stringify({ name: safeUser.name, role: safeUser.role }),
      });
    } catch {
      // Ignore if already registered
    }

    setStoredUser(safeUser);
    return safeUser;
  } catch (err) {
    if (err.isSuspended || err.statusCode === 403) {
      throw new Error('Your account has been suspended. Please contact an administrator.');
    }

    if (err.code === 'auth/network-request-failed') {
      throw new Error('Unable to connect to the authentication service. Please ensure the backend server is running.');
    }

    // Map Firebase Authentication error codes to user-friendly messages
    if (
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/wrong-password' ||
      err.code === 'auth/invalid-login-credentials' ||
      err.code === 'auth/configuration-not-found' ||
      err.code === 'auth/api-key-not-valid'
    ) {
      throw new Error('Invalid email or password.');
    }
    if (err.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    }
    if (err.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled. Please contact support.');
    }
    if (err.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later.');
    }

    // If already formatted, preserve message; otherwise default to clean error
    if (err.message && (err.message.includes('password') || err.message.includes('email'))) {
      throw err;
    }
    throw new Error('Invalid email or password.');
  }
}

/**
 * Register user using Firebase Auth & create backend user profile.
 * Strictly verifies registration with Firebase Authentication.
 */
export async function register({ name, email, password, role }) {
  const trimmedEmail = (email || '').trim();
  const trimmedName = (name || '').trim();

  if (!trimmedEmail) throw new Error('Please enter your email address.');
  if (!password) throw new Error('Please enter a password.');

  try {
    const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
    const user = credential.user;

    // Create user profile in Firestore backend
    const res = await apiRequest('/users/profile', {
      method: 'POST',
      body: JSON.stringify({ name: trimmedName, role: role || 'student' }),
    });

    const safeUser = res && res.user ? res.user : {
      uid: user.uid,
      name: trimmedName,
      email: user.email,
      role: role || 'student',
      status: 'active',
    };

    setStoredUser(safeUser);
    return safeUser;
  } catch (err) {
    if (err.code === 'auth/network-request-failed') {
      throw new Error('Unable to connect to the authentication service. Please ensure the backend server is running.');
    }
    if (err.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email already exists.');
    }
    if (err.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters long.');
    }
    if (err.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    }
    throw new Error(err.message || 'Registration failed. Please try again.');
  }
}

/**
 * Logout from Firebase Auth and clear session.
 */
export async function logout() {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('[AuthService] Firebase signout notice:', err.message);
  }
  setStoredUser(null);
}

/**
 * Listen to auth state changes from Firebase Auth.
 * Unauthenticated Firebase state strictly clears user session.
 */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const profile = await getCurrentUserProfile();
        if (profile) {
          if (profile.status === 'suspended') {
            await logout();
            callback(null, 'Your account has been suspended. Please contact an administrator.');
            return;
          }
          setStoredUser(profile);
          callback(profile);
          return;
        }
      } catch (err) {
        if (err.isSuspended) {
          await logout();
          callback(null, 'Your account has been suspended. Please contact an administrator.');
          return;
        }
      }

      // Safe fallback when profile doc has not loaded yet
      const fallbackUser = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        email: firebaseUser.email,
        role: 'student',
        status: 'active',
      };
      setStoredUser(fallbackUser);
      callback(fallbackUser);
    } else {
      // Firebase reports user is NOT authenticated — strictly clear session
      setStoredUser(null);
      callback(null);
    }
  });
}
