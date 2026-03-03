import { createContext, useContext, useMemo, useState } from 'react';

const normalizeStoredToken = (value: string | null): string | null => {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized || normalized === 'null' || normalized === 'undefined') return null;
  return normalized;
};

type AuthContextType = {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
