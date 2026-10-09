import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { User } from '../../../types';
import { Settings, Keyboard, LogOut } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface UserMenuProps {
  user: User | null;
  isCollapsed: boolean;
  onLogout: () => void;
}

export function UserMenu({ user, isCollapsed, onLogout }: UserMenuProps) {
  const trigger = (
    <button 
      className={cn(
        "flex items-center w-full rounded-lg transition-all duration-200 ease-out group focus:outline-none border border-transparent hover:border-zinc-200/80 hover:bg-white hover:shadow-sm",
        isCollapsed ? "p-1.5 justify-center" : "p-2 justify-between"
      )}
      aria-label="Open account menu"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-zinc-200 border border-zinc-300 flex items-center justify-center text-zinc-600 text-xs font-bold shrink-0 shadow-sm relative">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        {!isCollapsed && (
          <div className="flex flex-col text-left min-w-0">
            <p className="text-[13px] font-semibold text-zinc-900 truncate leading-tight">{user?.name}</p>
            <p className="text-[11px] font-medium text-zinc-500 truncate leading-tight mt-0.5">{user?.email}</p>
          </div>
        )}
      </div>
    </button>
  );

  const wrappedTrigger = isCollapsed ? (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{trigger}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="right" sideOffset={12} className="px-2.5 py-1.5 bg-zinc-800 flex flex-col items-start rounded-md shadow-lg animate-in fade-in zoom-in-95 z-50">
          <span className="text-xs font-semibold text-white">{user?.name || 'Account'}</span>
          <span className="text-[10px] text-zinc-300">{user?.email}</span>
          <Tooltip.Arrow className="fill-zinc-800" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  ) : trigger;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {wrappedTrigger}
      </DropdownMenu.Trigger>
      
      <DropdownMenu.Portal>
        <DropdownMenu.Content 
          side="top"
          align={isCollapsed ? "start" : "end"} 
          sideOffset={8} 
          className="w-[220px] bg-white rounded-lg border border-zinc-200/80 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 p-1 z-50 font-sans"
        >
          <div className="px-3 py-2.5 border-b border-zinc-100 mb-1">
            <p className="text-xs text-zinc-500 font-medium">Signed in as</p>
            <p className="text-sm font-semibold text-zinc-900 truncate">{user?.email}</p>
          </div>
          
          <DropdownMenu.Item 
            className="flex flex-col text-sm font-medium text-zinc-700 px-3 py-2 rounded-lg hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none cursor-pointer outline-none"
            onSelect={(e) => {
              e.preventDefault();
              if (user?.id) {
                navigator.clipboard.writeText(user.id);
                // Optional: show a toast notification here
              }
            }}
          >
            <div className="flex items-center justify-between w-full">
              <span>Copy User ID (for Desktop App)</span>
              <Keyboard size={16} strokeWidth={1.75} className="text-zinc-400" />
            </div>
            <p className="text-[10px] text-zinc-400 font-mono mt-1 truncate">{user?.id}</p>
          </DropdownMenu.Item>
          
          <DropdownMenu.Item className="flex items-center justify-between text-sm font-medium text-zinc-700 px-3 py-2 rounded-lg hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none cursor-not-allowed opacity-50 outline-none">
            Account Settings <Settings size={18} strokeWidth={1.75} className="text-zinc-400" />
          </DropdownMenu.Item>
          
          <DropdownMenu.Item className="flex items-center justify-between text-sm font-medium text-zinc-700 px-3 py-2 rounded-lg hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none cursor-not-allowed opacity-50 outline-none">
            Keyboard Shortcuts <Keyboard size={18} strokeWidth={1.75} className="text-zinc-400" />
          </DropdownMenu.Item>
          
          <DropdownMenu.Separator className="h-px bg-zinc-200 my-1" />
          
          <DropdownMenu.Item 
            onSelect={onLogout}
            className="flex items-center justify-between text-sm font-medium text-zinc-700 px-3 py-2 rounded-lg hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none cursor-pointer outline-none"
          >
            Logout <LogOut size={18} strokeWidth={1.75} className="text-zinc-400" />
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
