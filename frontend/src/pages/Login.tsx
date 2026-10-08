import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
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

  // Already authenticated → go to projects
  if (user) return <Navigate to="/projects" replace />;

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
      navigate('/projects');
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
          <label className="block text-xs font-semibold text-[#8A9099] uppercase tracking-wider">
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:border-[#5EE6B0] text-sm text-[#ECEAE4] transition-colors placeholder:text-[#5B616A]"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#8A9099] uppercase tracking-wider">
            Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:border-[#5EE6B0] text-sm text-[#ECEAE4] transition-colors placeholder:text-[#5B616A]"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 bg-[#5EE6B0] text-black font-bold rounded-lg hover:bg-[#4CD59F] transition-colors disabled:opacity-50 text-sm"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
