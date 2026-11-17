import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, authApi } from '../api/client';
import { Loader2 } from 'lucide-react';
import { disconnectSocket } from '../api/socket';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // GET /api/auth/me → 200 { user }
      const data = await authApi.me();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      disconnectSocket();
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C0A] flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-16 border border-[#D0E36A]/20 rounded-full animate-ping" />
          <Loader2 size={32} className="animate-spin text-[#D0E36A] relative z-10" />
        </div>
        <p className="mt-4 text-sm font-mono text-[#6E7268]">Resolving session...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
