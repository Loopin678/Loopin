import React, { useEffect, useState } from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { projectsApi, Project } from '../../api/client';
import { Menu, X, LogOut, FolderKanban, LayoutGrid, Users, Copy, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
          isActive
            ? 'bg-[rgba(94,230,176,0.10)] text-[#5EE6B0] border-l-2 border-[#5EE6B0] pl-2.5'
            : 'text-[#8A9099] hover:text-[#ECEAE4] hover:bg-[rgba(255,255,255,0.04)]'
        )
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { projectId } = useParams<{ projectId?: string }>();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (projectId) {
      projectsApi.get(projectId)
        .then(setProject)
        .catch(() => setProject(null));
    } else {
      setProject(null);
    }
  }, [projectId]);

  const copyUserId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Breadcrumb
  const isMembers = location.pathname.includes('/members');

  return (
    <div className="flex h-screen bg-[#0B0D10] text-[#ECEAE4] font-sans overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-50 w-60 bg-[#111418] border-r border-[rgba(255,255,255,0.06)] flex flex-col transition-transform duration-300 ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-[rgba(255,255,255,0.06)] shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-5 h-5 rounded bg-[#5EE6B0] flex items-center justify-center shrink-0">
              <div className="w-2 h-2 bg-[#0B0D10] rounded-full" />
            </div>
            <span className="font-bold text-[#ECEAE4] tracking-tight">Loopin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-[#5B616A] hover:text-[#ECEAE4] p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <NavItem to="/projects" icon={FolderKanban} label="All Projects" />

          {projectId && (
            <>
              <div className="pt-4 pb-1 px-3">
                <span className="text-[10px] font-bold text-[#5B616A] uppercase tracking-widest truncate block">
                  {project?.name || 'Current Project'}
                </span>
              </div>
              <NavItem to={`/projects/${projectId}`} icon={LayoutGrid} label="Board" />
              <NavItem to={`/projects/${projectId}/members`} icon={Users} label="Members" />
            </>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-[rgba(255,255,255,0.06)] shrink-0 space-y-2">
          {/* User ID copy row for adding members */}
          {user && (
            <div className="bg-[#161A1F] rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px] border border-[rgba(255,255,255,0.05)]">
              <span className="text-[#5B616A] font-mono truncate max-w-[130px]" title={user.id}>
                ID: {user.id.slice(0, 8)}...
              </span>
              <button
                onClick={copyUserId}
                className="text-[#8A9099] hover:text-[#5EE6B0] flex items-center gap-1 transition-colors"
                title="Copy your User ID (for invitations)"
              >
                {copied ? <Check size={12} className="text-[#5EE6B0]" /> : <Copy size={12} />}
                <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg group">
            <div className="w-7 h-7 rounded-full bg-[#1C2127] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-xs font-bold text-[#8A9099] shrink-0">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate text-[#ECEAE4]">{user?.name}</div>
              <div className="text-[10px] text-[#5B616A] truncate">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-[#5B616A] hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all shrink-0"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-[rgba(255,255,255,0.06)] bg-[#111418] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 text-[#5B616A] hover:text-[#ECEAE4] rounded-lg"
            >
              <Menu size={18} />
            </button>
            <div className="font-mono text-sm text-[#5B616A] flex items-center gap-1">
              <span className="text-[#5EE6B0]">~/</span>
              <span>loopin</span>
              <span className="text-[#2A3040]">/</span>
              <span className="text-[#8A9099]">projects</span>
              {project && (
                <>
                  <span className="text-[#2A3040]">/</span>
                  <span className="text-[#ECEAE4] font-medium max-w-[160px] truncate">
                    {project.name}
                  </span>
                </>
              )}
              {isMembers && (
                <>
                  <span className="text-[#2A3040]">/</span>
                  <span className="text-[#5EE6B0]">members</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden bg-[#0B0D10]">
          {children}
        </main>
      </div>
    </div>
  );
}
