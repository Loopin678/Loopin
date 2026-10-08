import React, { useState } from 'react';
import { Project } from '../../../types';
import { useNavigate } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import { ChevronsUpDown, Check, Plus, Search } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface WorkspaceSwitcherProps {
  projects: Project[];
  currentProject: Project | null;
  isCollapsed: boolean;
}

export function WorkspaceSwitcher({ projects, currentProject, isCollapsed }: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button 
          className={cn(
            "flex items-center text-left w-full hover:bg-white rounded-lg transition-all duration-200 ease-out group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] border border-transparent hover:border-black/10 hover:shadow-sm",
            isCollapsed ? "p-1.5 justify-center mt-2" : "p-2 mt-2 justify-between"
          )}
          aria-label="Switch project"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded bg-[#111111] text-white flex items-center justify-center font-bold text-sm shrink-0 transition-transform group-hover:scale-[1.02]">
              {currentProject?.name?.charAt(0).toUpperCase() || 'W'}
            </div>
            
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-sm text-[#111111] truncate leading-tight tracking-wide">
                  {currentProject?.name || 'Select Workspace'}
                </span>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <ChevronsUpDown size={16} strokeWidth={2} className="text-black/40 group-hover:text-black/70 shrink-0" />
          )}
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content 
          align="start" 
          sideOffset={8} 
          className="w-[260px] bg-white rounded-lg border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 z-50 p-1 flex flex-col font-sans"
        >
          {projects.length > 4 && (
            <div className="px-2 py-2 border-b border-zinc-100 relative">
              <Search size={18} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                autoFocus
                placeholder="Find workspace..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-sm bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 placeholder:text-zinc-400 text-zinc-800 font-medium"
              />
            </div>
          )}
          
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
            <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Your Workspaces</div>
            {filteredProjects.length === 0 ? (
              <div className="px-3 py-4 text-xs font-medium text-center text-zinc-500">No workspaces found.</div>
            ) : (
              filteredProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setIsOpen(false);
                    setSearchQuery('');
                    navigate(`/projects/${p.id}`);
                  }}
                  className="flex items-center justify-between w-full px-2 py-2 rounded-lg text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors focus:outline-none focus:bg-zinc-100"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-violet-50 text-violet-700 font-bold text-xs shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold truncate">{p.name}</span>
                  </div>
                  {currentProject?.id === p.id && <Check size={18} strokeWidth={1.75} className="text-violet-600 shrink-0" />}
                </button>
              ))
            )}
          </div>
          
          <div className="p-1 border-t border-zinc-100 mt-1">
            <button 
              onClick={() => {
                setIsOpen(false);
                navigate('/projects');
              }}
              className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <div className="w-6 h-6 rounded flex items-center justify-center bg-zinc-100 text-zinc-500 shrink-0">
                <Plus size={18} strokeWidth={1.75} /> 
              </div>
              Create New Project
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
