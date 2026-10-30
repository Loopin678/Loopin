import React from 'react';
import { getInitials } from '../../utils/initials';
import { cn } from '../../utils/cn';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Full class names written out, so Tailwind can see them at build time
const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-20 h-20 text-2xl',
};

// The same user id always gives the same colour, everywhere in the app
function hueFor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

interface AvatarProps {
  userId: string;
  name: string;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ userId, name, size = 'md', className }: AvatarProps) {
  const hue = hueFor(userId);

  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-full flex items-center justify-center font-bold shrink-0 select-none',
        SIZE_CLASSES[size],
        className
      )}
      style={{
        backgroundColor: `hsla(${hue}, 60%, 55%, 0.15)`,
        border: `1px solid hsla(${hue}, 60%, 60%, 0.35)`,
        color: `hsl(${hue}, 70%, 72%)`,
      }}
    >
      {getInitials(name)}
    </div>
  );
}