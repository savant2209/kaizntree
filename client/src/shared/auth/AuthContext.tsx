import { useMemo, useState } from 'react';

import { AuthContext, type AuthContextType } from './auth-context';

const normalizeStoredToken = (value: string | null): string | null => {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized || normalized === 'null' || normalized === 'undefined') return null;
  return normalized;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => normalizeStoredToken(localStorage.getItem('access_token')));

  const value = useMemo<AuthContextType>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login: (nextToken: string) => {
        const normalized = normalizeStoredToken(nextToken);
        if (!normalized) {
          localStorage.removeItem('access_token');
          setToken(null);
          return;
        }

        localStorage.setItem('access_token', normalized);
        setToken(normalized);
      },
      logout: () => {
        localStorage.removeItem('access_token');
        setToken(null);
      },
    }),
    [token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
