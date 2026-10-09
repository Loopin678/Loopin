import React from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../../api/client';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  footerText: string;
  footerLinkText: string;
  footerLinkTo: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, footerText, footerLinkText, footerLinkTo, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0B0D10] flex flex-col items-center justify-center font-sans px-4">
      {/* Loop motif - subtle */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-[rgba(94,230,176,0.06)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-[rgba(94,230,176,0.04)]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-6 h-6 rounded-md bg-[#5EE6B0] flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-[#0B0D10] rounded-full" />
            </div>
            <span className="font-bold text-lg text-[#ECEAE4] tracking-tight">Loopin</span>
          </div>
          <h1 className="text-2xl font-bold text-[#ECEAE4] tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-[#8A9099]">{subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 shadow-2xl">
          {children}

          {/* Divider */}
          <div className="mt-5 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(255,255,255,0.06)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-[#111418] text-[#5B616A]">or</span>
            </div>
          </div>

          {/* Google OAuth — full page navigation as required */}
          <div className="mt-4">
            <a
              href={`${API_URL}/api/auth/google`}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-[#161A1F] text-[#ECEAE4] border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-[#1C2127] hover:border-[rgba(255,255,255,0.12)] transition-all text-sm font-medium"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[#8A9099]">
          {footerText}{' '}
          <Link to={footerLinkTo} className="text-[#5EE6B0] font-semibold hover:underline">
            {footerLinkText}
          </Link>
        </p>
      </div>
    </div>
  );
}
