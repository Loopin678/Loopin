import React from 'react';
import { cn } from '../../utils/cn';
import { parseCover, projectCover, projectMonogram, isLightColor } from '../../utils/projectStyle';

interface ProjectCoverProps {
  projectId: string;
  name: string;
  cover?: string | null;
  className?: string;
  /** Show the project's initials on the cover */
  monogram?: boolean;
  monogramClassName?: string;
  /** Decorative hills on the default gradient (off for small tiles) */
  hills?: boolean;
  children?: React.ReactNode;
}

// Draws a project's cover (default gradient, stock art, solid colour or upload)
// everywhere a project appears, so a change shows up across the app at once.
export function ProjectCover({
  projectId,
  name,
  cover,
  className,
  monogram = true,
  monogramClassName,
  hills = true,
  children,
}: ProjectCoverProps) {
  const parsed = parseCover(cover);
  const lightText = parsed.kind === 'color' && isLightColor(parsed.hex);

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        parsed.kind === 'default' && cn('bg-gradient-to-br', projectCover(projectId)),
        className
      )}
      style={parsed.kind === 'color' ? { backgroundColor: parsed.hex } : undefined}
    >
      {(parsed.kind === 'stock' || parsed.kind === 'image') && (
        <img
          src={parsed.url}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {parsed.kind === 'default' && hills && (
        <div className="absolute inset-x-0 bottom-0 h-2/3 hills opacity-60" aria-hidden />
      )}
      {/* Soft shade at the bottom keeps the initials readable on busy images */}
      {(parsed.kind === 'stock' || parsed.kind === 'image') && monogram && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0" aria-hidden />
      )}
      {monogram && (
        <span
          className={cn(
            'absolute font-display font-semibold drop-shadow',
            lightText ? 'text-[#0B0C0A]/85' : 'text-white/90',
            monogramClassName ?? 'left-4 bottom-3 text-3xl'
          )}
        >
          {projectMonogram(name)}
        </span>
      )}
      {children}
    </div>
  );
}
