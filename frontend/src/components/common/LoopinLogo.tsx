import React from 'react';
import { cn } from '../../utils/cn';

// The official Loopin wordmark: "l∞pin". The two o's become one infinity loop
// (chartreuse) with a dot in each half: the team, going round the loop.
//
// It is text + an inline SVG, so it scales with font-size and stays crisp.
// Use `className` for size (e.g. "text-2xl") and colour of the letters.

// An infinity loop drawn as one continuous stroke (crosses in the middle)
const LOOP_PATH =
  'M60 30 C 50 14, 36 8, 26 8 C 14 8, 6 18, 6 30 C 6 42, 14 52, 26 52 C 36 52, 50 46, 60 30 C 70 14, 84 8, 94 8 C 106 8, 114 18, 114 30 C 114 42, 106 52, 94 52 C 84 52, 70 46, 60 30 Z';

export function LoopGlyph({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 60"
      aria-hidden="true"
      className={cn('inline-block shrink-0', className)}
      style={{ height: '0.62em', width: '1.24em', verticalAlign: '-0.02em' }}
    >
      {/* When animated, a faint full loop stays visible so the logo always reads "l∞pin" */}
      {animated && <path d={LOOP_PATH} fill="none" stroke="#D0E36A" strokeOpacity="0.28" strokeWidth="10" strokeLinejoin="round" />}
      <path
        d={LOOP_PATH}
        fill="none"
        stroke="#D0E36A"
        strokeWidth="10"
        strokeLinejoin="round"
        strokeLinecap="round"
        className={animated ? 'loop-glyph-trace' : undefined}
        pathLength={animated ? 100 : undefined}
      />
      <circle cx="28" cy="30" r="7" fill="currentColor" className={animated ? 'loop-glyph-dot' : undefined} />
      <circle cx="92" cy="30" r="7" fill="currentColor" className={animated ? 'loop-glyph-dot loop-glyph-dot-2' : undefined} />
    </svg>
  );
}

export function LoopinLogo({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <span
      role="img"
      aria-label="Loopin"
      className={cn('inline-flex items-baseline font-display font-semibold leading-none text-[#F4F5EF] select-none', className)}
      style={{ letterSpacing: '-0.03em' }}
    >
      <span aria-hidden="true">l</span>
      <LoopGlyph animated={animated} className="mx-[0.02em]" />
      <span aria-hidden="true">pin</span>
    </span>
  );
}

// The square app icon (same artwork as the favicon): four teammates inside an open loop
export function LoopinIcon({ className }: { className?: string }) {
  return <img src="/favicon.svg" alt="" aria-hidden="true" className={cn('inline-block', className)} />;
}
