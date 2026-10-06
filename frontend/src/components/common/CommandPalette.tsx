import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { Search, FolderKanban, LayoutDashboard, Command as CmdIcon, CheckCircle2 } from 'lucide-react';
import { projectsService } from '../../services/projects';
import { Project } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open && user && projects.length === 0) {
      projectsService.getProjectsByUser(user.id).then(setProjects).catch(console.error);
    }
  }, [open, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] backdrop-blur-sm flex items-start justify-center pt-[15vh] font-sans">
      <div className="absolute inset-0" onClick={() => setOpen(false)} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <Command label="Global Command Menu" className="flex flex-col w-full h-full">
          <div className="flex items-center px-4 py-3.5 border-b border-slate-100 bg-white">
            <Search size={20} className="text-violet-500 mr-3 shrink-0" />
            <Command.Input 
              placeholder="Search Loopin or execute commands..." 
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-slate-900 text-[15px] font-medium placeholder:text-slate-400 placeholder:font-normal"
            />
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1 rounded shadow-sm">
              ESC
            </div>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar bg-zinc-50/50">
            <Command.Empty className="py-12 text-center text-sm font-medium text-zinc-500 flex flex-col items-center">
              <CmdIcon size={24} strokeWidth={1.5} className="text-zinc-300 mb-3" />
              No results found.
            </Command.Empty>

            <Command.Group heading="Projects" className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              {projects.map(project => (
                <Command.Item
                  key={project.id}
                  onSelect={() => {
                    navigate(`/projects/${project.id}`);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-sm text-zinc-700 font-medium aria-selected:bg-zinc-100 aria-selected:text-zinc-900 cursor-pointer transition-colors group outline-none"
                >
                  <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100/50 flex items-center justify-center text-violet-600 shadow-sm transition-colors group-aria-selected:bg-white group-aria-selected:border-zinc-200">
                    <FolderKanban size={16} strokeWidth={1.75} />
                  </div>
                  {project.name}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Navigation" className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-2 border-t border-zinc-100">
              <Command.Item
                onSelect={() => {
                  navigate('/projects');
                  setOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-sm text-zinc-700 font-medium aria-selected:bg-zinc-100 aria-selected:text-zinc-900 cursor-pointer transition-colors outline-none group"
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200/50 flex items-center justify-center text-zinc-500 shadow-sm transition-colors group-aria-selected:bg-white group-aria-selected:border-zinc-200">
                  <LayoutDashboard size={16} strokeWidth={1.75} />
                </div>
                Go to Dashboard
              </Command.Item>
            </Command.Group>
            
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
