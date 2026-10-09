import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../../utils/cn';
import * as Tooltip from '@radix-ui/react-tooltip';

interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  statusBadge?: string;
  actionIcon?: React.ReactNode;
  onClick?: () => void;
  isCollapsed: boolean;
  accentColor?: string; // e.g. 'bg-editorial-mustard'
}

export function SidebarNavItem({
  icon: Icon,
  label,
  active,
  disabled,
  statusBadge,
  actionIcon,
  onClick,
  isCollapsed,
  accentColor
}: SidebarNavItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const content = (
    <button
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "flex items-center w-full text-left text-[14px] font-semibold rounded-lg transition-all duration-200 relative group h-10 overflow-hidden",
        isCollapsed ? "justify-center px-0" : "px-3 gap-3",
        active 
          ? "bg-[#111111] text-white shadow-sm" 
          : "text-[#555555] hover:bg-black/5 hover:text-[#111111]",
        disabled && "cursor-default hover:bg-transparent hover:text-black/40 opacity-90"
      )}
    >
      <Icon 
        size={18} 
        strokeWidth={active ? 2.5 : 2} 
        className={cn(
          "shrink-0 transition-colors duration-200 relative z-10",
          active ? (accentColor ? accentColor.replace('bg-', 'text-') : "text-white") : "text-black/40 group-hover:text-black/70"
        )} 
      />
      
      {!isCollapsed && (
        <div className="flex items-center justify-between flex-1 min-w-0">
          <span className="truncate">{label}</span>
          
          <div className="flex items-center shrink-0 h-full">
            {statusBadge === 'BETA' && (
              <span className="font-display text-[9px] font-bold bg-editorial-mint text-[#111111] px-1.5 py-[2px] rounded-sm uppercase tracking-wider ml-2 leading-none flex items-center justify-center border border-black/10">
                {statusBadge}
              </span>
            )}
            {statusBadge === 'Soon' && (
              <span className="font-display text-[9px] font-bold bg-editorial-mustard text-[#111111] px-1.5 py-[2px] rounded-sm uppercase tracking-wider ml-2 leading-none flex items-center justify-center border border-black/10">
                {statusBadge}
              </span>
            )}
            {actionIcon && isHovered && !disabled && (
              <div 
                className="ml-2 text-white hover:text-white/80 transition-colors flex items-center animate-in fade-in duration-200"
                onClick={(e) => { e.stopPropagation(); /* Add action logic if needed */ }}
              >
                {actionIcon}
              </div>
            )}
          </div>
        </div>
      )}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {content}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content 
            side="right" 
            sideOffset={12} 
            className="px-2.5 py-1.5 bg-[#111111] text-xs font-bold text-white rounded-md shadow-lg animate-in fade-in zoom-in-95 z-50 font-sans"
          >
            {label} {statusBadge && `(${statusBadge})`}
            <Tooltip.Arrow className="fill-[#111111]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  }

  return content;
}
