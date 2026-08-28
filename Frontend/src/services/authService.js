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
 * Login using Firebase Auth & backend profile retrieval
 */
export async function login(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    
    // Fetch user profile from backend
    try {
      const backendUser = await getCurrentUserProfile();
      if (backendUser) return backendUser;
    } catch (err) {
      if (err.isSuspended) throw err;
    }

    // Fallback profile if profile not created in Firestore yet
    const fallbackRole = email.includes('admin') ? 'admin' : email.includes('faculty') ? 'faculty' : email.includes('researcher') ? 'researcher' : 'student';
    const safeUser = {
      uid: user.uid,
      name: user.displayName || email.split('@')[0],
      email: user.email,
      role: fallbackRole,
      status: 'active',
    };
    
    // Create profile in Firestore if missing
    try {
      await apiRequest('/users/profile', {
        method: 'POST',
        body: JSON.stringify({ name: safeUser.name, role: safeUser.role }),
      });
    } catch (e) {
      // Ignore if already created
    }

    setStoredUser(safeUser);
    return safeUser;
  } catch (err) {
    if (err.isSuspended || err.statusCode === 403) {
      throw new Error('Your account has been suspended. Please contact an administrator.');
    }

    // Handle missing web API key or demo accounts gracefully in dev/presentation environments
    if (
      err.code === 'auth/api-key-not-valid' ||
      (err.message && err.message.includes('api-key-not-valid')) ||
      email.endsWith('@demo.com')
    ) {
      const fallbackRole = email.includes('admin')
        ? 'admin'
        : email.includes('faculty')
        ? 'faculty'
        : email.includes('researcher')
        ? 'researcher'
        : 'student';

      const demoName = email.split('@')[0];
      const safeUser = {
        uid: `demo-${demoName}-uid`,
        name: demoName.charAt(0).toUpperCase() + demoName.slice(1),
        email,
        role: fallbackRole,
        status: 'active',
        token: `demo-token-${demoName}`,
      };

      setStoredUser(safeUser);
      return safeUser;
    }

    // Handle standard Firebase Auth errors strictly
    if (
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/wrong-password' ||
      err.code === 'auth/invalid-login-credentials'
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

    throw new Error(err.message || 'Login failed. Please try again.');
  }
}

/**
 * Register user using Firebase Auth & create backend user profile
 */
export async function register({ name, email, password, role }) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Create user profile in Firestore backend
    const res = await apiRequest('/users/profile', {
      method: 'POST',
      body: JSON.stringify({ name, role }),
    });

    const safeUser = res && res.user ? res.user : {
      uid: user.uid,
      name,
      email,
      role: role || 'student',
      status: 'active',
    };

    setStoredUser(safeUser);
    return safeUser;
  } catch (err) {
    if (
      err.code === 'auth/api-key-not-valid' ||
      (err.message && err.message.includes('api-key-not-valid'))
    ) {
      const demoName = name || email.split('@')[0];
      const safeUser = {
        uid: `demo-${email.split('@')[0]}-uid`,
        name: demoName,
        email,
        role: role || 'student',
        status: 'active',
        token: `demo-token-${email.split('@')[0]}`,
      };
      setStoredUser(safeUser);
      return safeUser;
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
 * Logout from Firebase Auth and clear session
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
 * Listen to auth state changes to keep token refreshed
 */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const profile = await getCurrentUserProfile();
        callback(profile || getStoredUser());
      } catch (err) {
        if (err.isSuspended) {
          await logout();
          callback(null, 'Your account has been suspended. Please contact an administrator.');
        } else {
          callback(getStoredUser());
        }
      }
    } else {
      const storedUser = getStoredUser();
      callback(storedUser || null);
    }
  });
}
