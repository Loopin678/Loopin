import React, { useEffect, useState } from 'react';
import { LoopinLogo } from './LoopinLogo';

// Full-screen branded loader shown while we confirm who is signed in.
// The free backend can take a while to wake up, so after a few seconds we say so
// instead of leaving people staring at a spinner.
export function SplashScreen() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), 4000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen bg-[#0B0C0A] flex flex-col items-center justify-center px-6 relative overflow-hidden"
    >
      {/* Soft chartreuse glow behind the logo */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[320px] rounded-full bg-[#D0E36A]/[0.08] blur-[90px]" aria-hidden />

      <div className="relative animate-rise">
        <LoopinLogo animated className="text-6xl sm:text-7xl" />
      </div>

      <p className="relative mt-6 text-sm text-[#A1A69B] animate-rise [animation-delay:150ms]">Getting your workspace ready…</p>

      <p
        className={`relative mt-2 max-w-xs text-center text-xs text-[#6E7268] transition-opacity duration-700 ${slow ? 'opacity-100' : 'opacity-0'}`}
      >
        Waking up the server. The first visit after a quiet spell can take up to a minute.
      </p>
      <span className="sr-only">Loading Loopin</span>
    </div>
  );
}
