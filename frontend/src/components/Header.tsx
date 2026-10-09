import React, { useState, useEffect } from 'react';
import type { Project, User } from '../types';
import { 
  FolderGit2, 
  Plus, 
  GitCommit, 
  Kanban, 
  Laptop, 
  CheckCircle2, 
  UserCircle,
  LogOut,
  Sun,
  Moon,
  Users,
  Mail
} from 'lucide-react';
import { Button } from './ui/button';

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
  membersCount?: number;
  pendingInvitesCount?: number;
  onOpenMembersModal?: () => void;
  onOpenInvitesModal?: () => void;
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
  membersCount,
  pendingInvitesCount,
  onOpenMembersModal,
  onOpenInvitesModal,
}) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('loopin-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const saved = localStorage.getItem('loopin-theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('loopin-theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  return (
    <header className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-30 px-6 py-2.5 shadow-2xs">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Branding & Project Selector */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center shadow-sm">
              <FolderGit2 className="size-4.5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base text-foreground tracking-tight">Loopin</span>
              <span className="text-[11px] ml-1.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono border border-primary/20">web</span>
            </div>
          </div>

          <div className="h-5 w-px bg-border" />

          {/* Project Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project:</span>
            {projects.length > 0 ? (
              <select
                value={currentProject?.id || ''}
                onChange={(e) => {
                  const p = projects.find((x) => x.id === e.target.value);
                  if (p) onSelectProject(p);
                }}
                className="bg-secondary text-foreground text-xs font-medium rounded-lg px-2.5 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer min-w-[180px]"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-muted-foreground italic">No projects yet</span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenNewProject}
              title="Create New Project"
              className="h-7 text-xs px-2.5 gap-1"
            >
              <Plus className="size-3.5" />
              <span>New</span>
            </Button>

            {currentProject && onOpenMembersModal && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenMembersModal}
                title="Manage Project Members & Invites"
                className="h-7 text-xs px-2.5 gap-1.5"
              >
                <Users className="size-3.5 text-primary" />
                <span>Members</span>
                {membersCount !== undefined && membersCount > 0 && (
                  <span className="font-mono text-[10px] bg-secondary px-1 rounded">
                    {membersCount}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <div className="flex items-center bg-secondary/70 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'board'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Kanban className="size-3.5" />
            <span>Board</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'board' ? 'bg-primary/30 text-white' : 'bg-muted text-muted-foreground'}`}>
              {taskCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('commits')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'commits'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <GitCommit className="size-3.5" />
            <span>Git Commits</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'commits' ? 'bg-primary/30 text-white' : 'bg-muted text-muted-foreground'}`}>
              {commitCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'desktop'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Laptop className="size-3.5" />
            <span>Desktop Sync</span>
          </button>
        </div>

        {/* Right: DB & Logged In User */}
        <div className="flex items-center gap-2.5">
          {pendingInvitesCount !== undefined && pendingInvitesCount > 0 && onOpenInvitesModal && (
            <Button
              size="sm"
              onClick={onOpenInvitesModal}
              title="You have pending project invitations"
              className="h-7 text-xs px-2.5 gap-1.5 shadow-xs"
            >
              <Mail className="size-3.5" />
              <span>{pendingInvitesCount} Invite{pendingInvitesCount > 1 ? 's' : ''}</span>
            </Button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
            <CheckCircle2 className="size-3" />
            <span className="font-mono text-[10px]">Supabase Live</span>
          </div>

          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="size-7 rounded-lg border border-border/80 hover:bg-muted text-foreground"
          >
            {theme === 'dark' ? (
              <Sun className="size-3.5 text-amber-400" />
            ) : (
              <Moon className="size-3.5 text-muted-foreground hover:text-foreground" />
            )}
          </Button>

          {/* User profile & Logout */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-border">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <UserCircle className="size-4" />}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-medium text-foreground max-w-[120px] truncate leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-muted-foreground max-w-[120px] truncate leading-tight">
                  {currentUser.email}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onLogout}
              title="Sign Out"
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
