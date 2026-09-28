import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
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

export function resolveUserRole(email, explicitRole = null) {
  if (explicitRole) {
    const norm = normalizeRole(explicitRole);
    if (norm) return norm;
  }
  const e = (email || '').toLowerCase().trim();
  if (e.includes('admin')) return 'admin';
  if (e.includes('faculty') || e.includes('researcher')) return 'faculty_researcher';
  return 'student';
}

/**
 * Fetch current user profile from backend /api/users/me
 */
export async function getCurrentUserProfile(tokenOverride = null, expectedEmail = null) {
  try {
    const headers = tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : {};
    const res = await apiRequest('/users/me', { headers, token: tokenOverride });
    if (res && res.success && res.user && res.user.role) {
      const fullUser = {
        ...res.user,
        role: normalizeRole(res.user.role),
        token: tokenOverride || res.user.token
      };
      setStoredUser(fullUser);
      return fullUser;
    }
  } catch (err) {
    if (err.isSuspended) {
      throw err;
    }
    console.warn('[AuthService] Backend profile fetch notice:', err.message);
  }

  const stored = getStoredUser();
  if (stored && stored.role) {
    if (expectedEmail) {
      if ((stored.email || '').toLowerCase() === expectedEmail.toLowerCase()) {
        return stored;
      }
      return null;
    }
    return stored;
  }
  return null;
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

  // Clear existing session immediately to prevent stale cross-account leakage
  setStoredUser(null);

  // If a different user is currently signed in to Firebase Auth, sign them out first
  if (auth.currentUser && auth.currentUser.email && auth.currentUser.email.toLowerCase() !== trimmedEmail.toLowerCase()) {
    try {
      await firebaseSignOut(auth);
    } catch {
      // Ignore signout error
    }
  }

  try {
    // 1. Authenticate with Firebase Auth
    const credential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
    const user = credential.user;
    let token = null;
    try {
      token = await user.getIdToken();
    } catch (tErr) {
      console.warn('[AuthService] Token retrieval error during login:', tErr.message);
    }

    // 2. Fetch authenticated user profile from backend Firestore
    let backendUser = null;
    try {
      backendUser = await getCurrentUserProfile(token, trimmedEmail);
    } catch (err) {
      if (err.isSuspended) {
        await firebaseSignOut(auth);
        setStoredUser(null);
        throw new Error('Your account has been suspended. Please contact an administrator.');
      }
    }

    if (backendUser && backendUser.role) {
      if (backendUser.status === 'suspended') {
        await firebaseSignOut(auth);
        setStoredUser(null);
        throw new Error('Your account has been suspended. Please contact an administrator.');
      }
      const finalUser = {
        ...backendUser,
        role: normalizeRole(backendUser.role),
        token: token || backendUser.token
      };
      setStoredUser(finalUser);
      return finalUser;
    }

    // 3. Fallback safe profile with resolved role (never blindly downgrades admin/faculty to student)
    const resolvedRole = resolveUserRole(trimmedEmail);
    const safeUser = {
      uid: user.uid,
      name: user.displayName || trimmedEmail.split('@')[0],
      email: user.email,
      role: resolvedRole,
      status: 'active',
      token: token || undefined,
    };

    // Attempt to register initial profile in Firestore
    try {
      await apiRequest('/users/profile', {
        method: 'POST',
        token,
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
      let token = null;
      try {
        token = await firebaseUser.getIdToken();
      } catch (tErr) {
        console.warn('[AuthService] Token retrieval error in subscribeToAuthChanges:', tErr.message);
      }

      try {
        const profile = await getCurrentUserProfile(token, firebaseUser.email);
        if (profile && profile.role) {
          if (profile.status === 'suspended') {
            await logout();
            callback(null, 'Your account has been suspended. Please contact an administrator.');
            return;
          }
          const finalProfile = {
            ...profile,
            role: normalizeRole(profile.role),
            token: token || profile.token
          };
          setStoredUser(finalProfile);
          callback(finalProfile);
          return;
        }
      } catch (err) {
        if (err.isSuspended) {
          await logout();
          callback(null, 'Your account has been suspended. Please contact an administrator.');
          return;
        }
      }

      // Safe fallback when profile doc has not loaded yet: preserve stored role or infer from email
      const stored = getStoredUser();
      const role = (stored && stored.email === firebaseUser.email && stored.role)
        ? normalizeRole(stored.role)
        : resolveUserRole(firebaseUser.email);

      const fallbackUser = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        email: firebaseUser.email,
        role: role,
        status: 'active',
        token: token || stored?.token || undefined,
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

/**
 * Request password reset instructions via Firebase Auth or backend recovery.
 */
export async function requestPasswordReset(email) {
  const trimmedEmail = (email || '').trim();
  if (!trimmedEmail) {
    throw new Error('Please enter your email address.');
  }

  // 1. Try Firebase Authentication sendPasswordResetEmail first
  try {
    await sendPasswordResetEmail(auth, trimmedEmail);
    return {
      success: true,
      message: `Password reset instructions have been sent to ${trimmedEmail}.`
    };
  } catch (err) {
    // 2. Fall back to backend user recovery endpoint
    try {
      const res = await apiRequest('/users/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail })
      });
      if (res && res.success) {
        return res;
      }
      throw new Error(res?.message || 'Failed to send password reset request.');
    } catch (backendErr) {
      if (
        err.code === 'auth/user-not-found' ||
        backendErr.message?.includes('No account found') ||
        backendErr.message?.includes('EMAIL_NOT_FOUND')
      ) {
        throw new Error('No account found with this email address.');
      }
      if (err.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      throw new Error(backendErr.message || err.message || 'Unable to process password reset. Please try again.');
    }
  }
}

/**
 * Directly reset password with new password (validation + update)
 */
export async function resetUserPasswordDirect({ email, newPassword, confirmPassword }) {
  const res = await apiRequest('/users/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, newPassword, confirmPassword })
  });
  return res;
}

