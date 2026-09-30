import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth.service';
import { TOKEN_KEY } from '../utils/constants';
import { getErrorMessage } from '../utils/errors';

export const AuthContext = createContext(null);

function sanitizeUser(user) {
  if (!user) return null;
  const {
    password,
    refreshToken,
    passwordResetToken,
    passwordResetExpires,
    __v,
    ...safe
  } = user;
  return safe;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setDoctor(null);
  }, []);

  const hydrate = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await authService.me();
      setUser(sanitizeUser(data.user));
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setDoctor(null);
    };
    window.addEventListener('mediai:unauthorized', onUnauthorized);
    return () => window.removeEventListener('mediai:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await authService.login(credentials);
    const accessToken = data?.data?.accessToken;
    if (accessToken) {
      localStorage.setItem(TOKEN_KEY, accessToken);
    }
    setUser(sanitizeUser(data?.data?.user));
    setDoctor(data?.data?.doctor ?? null);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Session is cleared locally regardless of network outcome.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      doctor,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshUser: hydrate,
      getErrorMessage,
    }),
    [user, doctor, loading, login, logout, hydrate]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
