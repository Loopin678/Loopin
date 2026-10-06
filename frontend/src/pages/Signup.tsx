import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/projects" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.register(name, email, password);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Join your team's workspace today."
      footerText="Already have an account?"
      footerLinkText="Log in"
      footerLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 text-sm text-[var(--color-accent-red)] bg-red-50/50 border border-red-100 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Full name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--color-bg-canvas)] border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]/10 focus:border-[var(--color-border-focus)] transition-all sm:text-sm placeholder:text-[var(--color-text-muted)]"
            placeholder="Jane Doe"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--color-bg-canvas)] border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]/10 focus:border-[var(--color-border-focus)] transition-all sm:text-sm placeholder:text-[var(--color-text-muted)]"
            placeholder="name@example.com"
          />
        </div>
        
        <div className="space-y-1.5 relative">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--color-bg-canvas)] border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]/10 focus:border-[var(--color-border-focus)] transition-all sm:text-sm placeholder:text-[var(--color-text-muted)]"
              placeholder="••••••••"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-2.5 px-4 bg-[var(--color-text-primary)] text-white font-medium rounded-lg hover:bg-black transition-colors disabled:opacity-70 shadow-sm"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
