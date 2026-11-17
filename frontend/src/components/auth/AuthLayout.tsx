import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { API_URL } from '../../api/client';
import { LoopinMark } from '../../pages/Landing';

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
    <div className="min-h-screen bg-[#0B0C0A] p-2 md:p-3 font-sans">
      <div className="relative min-h-[calc(100vh-1rem)] md:min-h-[calc(100vh-1.5rem)] rounded-[28px] md:rounded-[36px] overflow-hidden dusk-sky flex flex-col items-center justify-center px-4 py-24">
        <div className="absolute inset-x-0 bottom-0 h-1/2 hills" aria-hidden />

        {/* Floating top bar */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between">
          <Link to="/" className="rounded-full pl-4 pr-5 py-2 bg-gradient-to-b from-[#1C2018] to-[#10120E] border border-[rgba(208,227,106,0.18)] shadow-lg"><LoopinMark /></Link>
          <Link to="/" className="rounded-full px-4 py-2.5 bg-gradient-to-b from-[#1C2018] to-[#10120E] border border-[rgba(208,227,106,0.18)] text-sm text-white/80 hover:text-[#D0E36A] transition-colors inline-flex items-center gap-1.5">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>

        <div className="relative w-full max-w-sm animate-rise">
          <div className="text-center mb-7">
            <h1 className="text-3xl md:text-4xl font-semibold text-white">{title}</h1>
            <p className="mt-2 text-sm text-white/75">{subtitle}</p>
          </div>

          {/* Card */}
          <div className="rounded-[28px] bg-[#0B0C0A]/85 border border-white/10 backdrop-blur-xl p-6 shadow-2xl shadow-black/40">
            {children}

            {/* Divider */}
            <div className="mt-5 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-[#10120E] text-white/40 rounded">or</span>
              </div>
            </div>

            {/* Google OAuth — full page navigation as required */}
            <div className="mt-4">
              <a
                href={`${API_URL}/api/auth/google`}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white/5 text-white border border-white/10 rounded-full hover:bg-white/10 transition-all text-sm font-medium"
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

          <p className="mt-6 text-center text-sm text-white/80">
            {footerText}{' '}
            <Link to={footerLinkTo} className="text-[#D0E36A] font-semibold hover:underline">
              {footerLinkText}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
