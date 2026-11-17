import React, { useState } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { getPostLoginPath } from '../utils/postLoginPath';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Loader2 } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // The page they were trying to open before being sent to sign in, else Home
  const destination = getPostLoginPath(location.state);

  // Already authenticated → go on
  if (user) return <Navigate to={destination} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // POST /api/auth/login { email, password } → 200 { user }
      // Cookie is set by server automatically
      await authApi.login({ email, password });
      await checkAuth(); // re-fetch /api/auth/me to hydrate context
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Loopin workspace."
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkTo="/register"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
            {error}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#A1A69B] uppercase tracking-wider">
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#1B1E19] border border-[rgba(255,255,255,0.08)] rounded-xl focus:outline-none focus:border-[#D0E36A] text-sm text-[#F4F5EF] transition-colors placeholder:text-[#6E7268]"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#A1A69B] uppercase tracking-wider">
            Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#1B1E19] border border-[rgba(255,255,255,0.08)] rounded-xl focus:outline-none focus:border-[#D0E36A] text-sm text-[#F4F5EF] transition-colors placeholder:text-[#6E7268]"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 bg-[#D0E36A] text-black font-bold rounded-full hover:bg-[#BED158] transition-colors disabled:opacity-50 text-sm"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
