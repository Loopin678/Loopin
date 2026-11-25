import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, authApi } from '../api/client';
import { disconnectSocket } from '../api/socket';

// A yes/no hint that this browser was signed in last time (never a token or any
// user data). It lets a returning user see the logo while the session loads,
// instead of the landing page flashing before they are sent to Home.
const SESSION_HINT = 'loopin:had-session';

function readSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT) === '1';
  } catch {
    return false;
  }
}

function writeSessionHint(on: boolean): void {
  try {
    if (on) localStorage.setItem(SESSION_HINT, '1');
    else localStorage.removeItem(SESSION_HINT);
  } catch {
    /* storage blocked: we just lose the hint */
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** True while loading if this browser was signed in last time */
  probablySignedIn: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [probablySignedIn] = useState(readSessionHint);

  const checkAuth = async () => {
    try {
      // GET /api/auth/me → 200 { user }
      const data = await authApi.me();
      setUser(data.user);
      writeSessionHint(true);
    } catch {
      setUser(null);
      writeSessionHint(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      writeSessionHint(false);
      setUser(null);
      disconnectSocket();
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);


  return (
    <AuthContext.Provider value={{ user, loading, probablySignedIn, setUser, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
