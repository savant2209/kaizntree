import { createContext, useContext, useMemo, useState } from 'react';

type AuthContextType = {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));

  const value = useMemo<AuthContextType>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login: (nextToken: string) => {
        localStorage.setItem('access_token', nextToken);
        setToken(nextToken);
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
