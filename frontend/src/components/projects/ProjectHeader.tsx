import React from 'react';
import { Project } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { FolderKanban, MoreHorizontal, Settings, Plus, Bell } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';

export function ProjectHeader({ project }: { project: Project }) {
  const { user } = useAuth();
  
  return (
    <Tooltip.Provider delayDuration={200}>
      <header className="px-8 py-6 border-b border-black/10 bg-editorial-surface shrink-0 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-editorial-mustard rounded-lg flex items-center justify-center text-[#111111] shadow-sm shrink-0 border border-black/10">
            <FolderKanban size={24} strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <h2 className="font-display text-3xl font-black tracking-tight text-[#111111] leading-none mb-1.5">
              {project.name}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-black/50">
                Software Project
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-editorial-cobalt bg-editorial-cobalt/10 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-editorial-cobalt" /> Active
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Invite Action */}
          <button className="flex items-center gap-1.5 text-sm font-bold text-white bg-[#111111] hover:bg-editorial-mustard hover:text-[#111111] px-4 py-2 rounded-lg border border-transparent shadow-sm transition-colors mr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]">
            <Plus size={16} strokeWidth={2} /> Invite
          </button>

          <div className="w-px h-6 bg-black/10 mx-1" />
          
          <div className="flex items-center gap-1.5">
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button className="relative w-9 h-9 flex items-center justify-center text-black/50 hover:bg-black/5 hover:text-[#111111] rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]">
                  <Bell size={18} strokeWidth={2} />
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-editorial-coral border-[1.5px] border-white" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content side="bottom" sideOffset={5} className="px-2.5 py-1.5 bg-zinc-800 text-xs font-semibold text-white rounded-md shadow-lg z-50">
                  Notifications
                  <Tooltip.Arrow className="fill-zinc-800" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button className="w-9 h-9 flex items-center justify-center text-black/50 hover:bg-black/5 hover:text-[#111111] rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]">
                  <Settings size={18} strokeWidth={2} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content side="bottom" sideOffset={5} className="px-2.5 py-1.5 bg-[#111111] text-xs font-bold text-white rounded-md shadow-lg z-50">
                  Project settings
                  <Tooltip.Arrow className="fill-[#111111]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
            
            <DropdownMenu.Root>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <DropdownMenu.Trigger asChild>
                    <button className="w-9 h-9 flex items-center justify-center text-black/50 hover:bg-black/5 hover:text-[#111111] rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]">
                      <MoreHorizontal size={18} strokeWidth={2} />
                    </button>
                  </DropdownMenu.Trigger>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content side="bottom" sideOffset={5} className="px-2.5 py-1.5 bg-[#111111] text-xs font-bold text-white rounded-md shadow-lg z-50">
                    More actions
                    <Tooltip.Arrow className="fill-[#111111]" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={5} className="w-48 bg-white border border-black/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 p-1 z-50 font-sans">
                  <DropdownMenu.Item className="text-sm font-semibold text-black/70 px-3 py-2 rounded-lg hover:bg-black/5 focus:bg-black/5 focus:outline-none cursor-not-allowed opacity-50">
                    Export Data
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-black/10 my-1" />
                  <DropdownMenu.Item className="text-sm font-semibold text-editorial-coral px-3 py-2 rounded-lg hover:bg-editorial-coral/10 focus:bg-editorial-coral/10 focus:outline-none cursor-not-allowed opacity-50">
                    Archive Project
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </header>
    </Tooltip.Provider>
  );
}
