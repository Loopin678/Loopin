import React from 'react';
import type { Project, User } from '../types';
import { 
  FolderGit2, 
  Plus, 
  GitCommit, 
  Kanban, 
  Laptop, 
  CheckCircle2, 
  UserCircle,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  projects: Project[];
  currentProject: Project | null;
  onSelectProject: (p: Project) => void;
  onOpenNewProject: () => void;
  currentUser: User;
  onLogout: () => void;
  activeTab: 'board' | 'commits' | 'desktop';
  setActiveTab: (tab: 'board' | 'commits' | 'desktop') => void;
  taskCount: number;
  commitCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  currentProject,
  onSelectProject,
  onOpenNewProject,
  currentUser,
  onLogout,
  activeTab,
  setActiveTab,
  taskCount,
  commitCount,
}) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-900/95 backdrop-blur sticky top-0 z-30 px-6 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Branding & Project Selector */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FolderGit2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">Loopin</span>
              <span className="text-xs ml-1.5 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono border border-indigo-500/20">web</span>
            </div>
          </div>

          <div className="h-6 w-px bg-neutral-800" />

          {/* Project Dropdown (strictly showing only this user's projects) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Project:</span>
            {projects.length > 0 ? (
              <select
                value={currentProject?.id || ''}
                onChange={(e) => {
                  const p = projects.find((x) => x.id === e.target.value);
                  if (p) onSelectProject(p);
                }}
                className="bg-neutral-800 text-neutral-100 text-sm font-medium rounded-lg px-3 py-1.5 border border-neutral-700 hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[200px]"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-neutral-400 italic">No projects yet</span>
            )}

            <button
              onClick={onOpenNewProject}
              title="Create New Project"
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition flex items-center gap-1 text-xs px-2.5 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <div className="flex items-center bg-neutral-800/80 p-1 rounded-xl border border-neutral-700/60">
          <button
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'board'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Tasks</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'board' ? 'bg-indigo-700 text-white' : 'bg-neutral-700 text-neutral-300'}`}>
              {taskCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('commits')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'commits'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Git Commits</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'commits' ? 'bg-indigo-700 text-white' : 'bg-neutral-700 text-neutral-300'}`}>
              {commitCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'desktop'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Desktop Sync</span>
          </button>
        </div>

        {/* Right: DB & Logged In User */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">Supabase Live</span>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-3 pl-3 border-l border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <UserCircle className="w-4 h-4" />}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-medium text-neutral-200 max-w-[120px] truncate leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-neutral-400 max-w-[120px] truncate leading-tight">
                  {currentUser.email}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-red-300 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
