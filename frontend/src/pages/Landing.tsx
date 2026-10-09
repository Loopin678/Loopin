import React from 'react';
export function Landing() { 
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center font-sans overflow-hidden relative">
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div className="w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] border border-[var(--color-border-strong)] rounded-full absolute opacity-20" />
        <div className="w-[45vw] h-[45vw] max-w-[600px] max-h-[600px] border border-[var(--color-accent)] rounded-full absolute opacity-10 animate-[spin_60s_linear_infinite]" />
        <div className="w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-[var(--color-accent)] rounded-full absolute opacity-[0.03] blur-3xl" />
      </div>
      
      <div className="relative z-10 max-w-3xl text-center space-y-6 px-4">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--color-text-main)]">
          Work doesn't happen in a line. <br/>
          <span className="text-[var(--color-accent)]">It happens in a loop.</span>
        </h1>
        <p className="text-xl md:text-2xl text-[var(--color-text-muted)] font-medium">
          Plan. Build. Discuss. Review. Ship. Repeat.
        </p>
        <div className="pt-8 flex justify-center gap-4">
          <a href="/register" className="px-6 py-3 bg-[var(--color-accent)] text-[#000] rounded-lg hover:bg-[#4CD59F] shadow-sm transition-colors font-bold tracking-wide">
            Get started
          </a>
          <a href="/login" className="px-6 py-3 bg-[var(--color-surface-2)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-3)] transition-colors font-semibold">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
