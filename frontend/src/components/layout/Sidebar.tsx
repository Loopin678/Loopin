import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth';
import { projectsService } from '../../services/projects';
import { Project } from '../../types';
import { 
  LayoutGrid,
  Users,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Command,
  ChevronDown,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '../../utils/cn';

import { WorkspaceSwitcher } from './sidebar/WorkspaceSwitcher';
import { SidebarNavItem } from './sidebar/SidebarNavItem';
import { UserMenu } from './sidebar/UserMenu';

export function Sidebar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Collapsible Groups
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);

  // Load Projects
  useEffect(() => {
    if (user) {
      projectsService.getProjectsByUser(user.id).then(data => {
        setProjects(data);
        if (projectId) {
          const current = data.find(p => p.id === projectId);
          if (current) setCurrentProject(current);
        }
      });
    }
  }, [user, projectId]);

  // Handle Cmd+B / Ctrl+B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
      navigate('/login');
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { icon: LayoutGrid, label: 'Board', path: `/projects/${projectId}`, active: location.pathname.includes('/tasks') || location.pathname.endsWith(projectId || ''), accentColor: 'text-editorial-mint' },
    { icon: Users, label: 'Members', disabled: true, statusBadge: 'Soon', actionIcon: <MoreHorizontal size={18} strokeWidth={2} /> },
    { icon: MessageSquare, label: 'Chat', disabled: true, statusBadge: 'BETA', actionIcon: <MoreHorizontal size={18} strokeWidth={2} /> },
  ];

  return (
    <Tooltip.Provider delayDuration={200}>
      <aside 
        className={cn(
          "bg-editorial-bg flex flex-col h-full border-r border-black/10 text-[#111111] shrink-0 font-sans transition-all duration-200 ease-out relative z-20",
          isCollapsed ? "w-[76px]" : "w-[260px]"
        )}
      >
        
        {/* Header Area */}
        <div className="flex flex-col px-3 pt-5 pb-2 shrink-0">
          <div className={cn(
            "flex items-center mb-6",
            isCollapsed ? "justify-center" : "px-1 mt-1"
          )}>
            <div className="flex items-center gap-3 select-none cursor-default">
              <div className="bg-editorial-cobalt p-1.5 rounded-md text-white shadow-sm flex items-center justify-center">
                <Command size={20} strokeWidth={2.5} />
              </div>
              {!isCollapsed && <span className="font-display font-black text-2xl tracking-tight text-[#111111]">Loopin.</span>}
            </div>
          </div>
          
          <WorkspaceSwitcher 
            projects={projects} 
            currentProject={currentProject} 
            isCollapsed={isCollapsed} 
          />
        </div>

        {/* Separator */}
        <div className="px-4 py-3">
          <div className="h-px w-full bg-black/5" />
        </div>

        {/* Navigation */}
        <div className={cn(
          "flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5",
          isCollapsed ? "px-2" : "px-3"
        )}>
          {!isCollapsed && (
            <div 
              className="flex items-center justify-between px-2 py-1 mt-1 mb-2 group cursor-pointer select-none"
              onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
            >
              <p className="font-display text-[11px] font-bold tracking-[0.15em] text-black/40 uppercase">
                Workspace
              </p>
              {isWorkspaceOpen ? (
                <ChevronDown size={16} strokeWidth={2} className="text-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              ) : (
                <ChevronRight size={16} strokeWidth={2} className="text-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          )}
          
          {(isWorkspaceOpen || isCollapsed) && navItems.map((item, idx) => (
            <SidebarNavItem
              key={idx}
              icon={item.icon}
              label={item.label}
              active={item.active}
              disabled={item.disabled}
              statusBadge={item.statusBadge}
              actionIcon={item.actionIcon}
              isCollapsed={isCollapsed}
              onClick={() => item.path && navigate(item.path)}
            />
          ))}
        </div>

        {/* Separator before Footer */}
        <div className="px-4 py-2">
          <div className="h-px w-full bg-zinc-200/50" />
        </div>

        {/* Footer Area */}
        <div className={cn(
          "shrink-0 pb-4 pt-1 flex flex-col gap-1",
          isCollapsed ? "px-2 items-center" : "px-3"
        )}>
          <div className={cn("flex w-full mb-1", isCollapsed ? "justify-center" : "justify-start px-1")}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button 
                  onClick={() => setIsCollapsed(!isCollapsed)} 
                  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className="flex items-center justify-center text-black/40 hover:text-[#111111] bg-transparent hover:bg-black/5 active:bg-black/10 rounded-lg transition-colors p-2 h-9 w-9 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
                >
                  {isCollapsed ? (
                    <PanelLeftOpen size={20} strokeWidth={2} />
                  ) : (
                    <PanelLeftClose size={20} strokeWidth={2} />
                  )}
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content 
                  side="right" 
                  sideOffset={12} 
                  className="px-2.5 py-1.5 bg-[#111111] text-xs font-bold text-white rounded-md shadow-lg animate-in fade-in zoom-in-95 z-50"
                >
                  {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  <Tooltip.Arrow className="fill-[#111111]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>

          <UserMenu 
            user={user} 
            isCollapsed={isCollapsed} 
            onLogout={handleLogout} 
          />
        </div>

      </aside>
    </Tooltip.Provider>
  );
}
