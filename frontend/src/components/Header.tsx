import React from 'react';
import type { Project, User } from '../types';
import { 
  FolderGit2, 
  Plus, 
  GitCommit, 
  Kanban, 
  Laptop, 
  CheckCircle2, 
  UserCircle 
} from 'lucide-react';

interface HeaderProps {
  projects: Project[];
  currentProject: Project | null;
  onSelectProject: (p: Project) => void;
  onOpenNewProject: () => void;
  currentUser: User;
  users: User[];
  onSelectUser: (u: User) => void;
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
  users,
  onSelectUser,
  activeTab,
  setActiveTab,
  taskCount,
  commitCount,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-6 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Branding & Project Selector */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FolderGit2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">Loopin</span>
              <span className="text-xs ml-1.5 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono border border-sky-500/20">web</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Project Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Project:</span>
            <select
              value={currentProject?.id || ''}
              onChange={(e) => {
                const p = projects.find((x) => x.id === e.target.value);
                if (p) onSelectProject(p);
              }}
              className="bg-slate-800 text-slate-100 text-sm font-medium rounded-lg px-3 py-1.5 border border-slate-700 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer min-w-[200px]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={onOpenNewProject}
              title="Create New Project"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'board'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Tasks</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'board' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
              {taskCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('commits')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'commits'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Git Commits</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'commits' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
              {commitCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'desktop'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Desktop Sync</span>
          </button>
        </div>

        {/* Right: DB & User status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">Supabase Live</span>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <UserCircle className="w-4 h-4 text-slate-400" />
            <select
              value={currentUser.id}
              onChange={(e) => {
                const u = users.find((x) => x.id === e.target.value);
                if (u) onSelectUser(u);
              }}
              className="bg-transparent text-xs text-slate-300 hover:text-white cursor-pointer focus:outline-none"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-800 text-white">
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
