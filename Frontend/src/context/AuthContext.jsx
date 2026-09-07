import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  login as apiLogin, 
  logout as apiLogout, 
  register as apiRegister, 
  getRoleRedirect,
  subscribeToAuthChanges 
} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Subscribe to Firebase Auth state changes
    const unsubscribe = subscribeToAuthChanges((u, errorMsg) => {
      if (errorMsg) {
        setAuthError(errorMsg);
        setUser(null);
      } else {
        setUser(u);
        setAuthError(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    const u = await apiLogin(email, password);
    setUser(u);
    return getRoleRedirect(u.role);
  }, []);

  const register = useCallback(async (data) => {
    setAuthError(null);
    const u = await apiRegister(data);
    setUser(u);
    return getRoleRedirect(u.role);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setAuthError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
