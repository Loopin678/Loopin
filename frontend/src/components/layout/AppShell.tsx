import React, { useEffect, useState, useCallback , useRef} from 'react';
import { NavLink, Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '../common/Avatar';import { connectSocket, disconnectSocket } from '../../api/socket';
import { useAuth } from '../../context/AuthContext';
import { projectsApi, Project } from '../../api/client';
import { Menu, X, LogOut, FolderKanban, LayoutGrid, Users, MessageSquare, Home as HomeIcon } from 'lucide-react';
import { rememberProject } from '../../utils/recentProjects';
import { cn } from '../../utils/cn';
import { useInvitations } from '../../hooks/useInvitations';
import { NotificationBell } from '../common/NotificationBell';


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
  const { user, logout, setUser } = useAuth();
  const { projectId } = useParams<{ projectId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);

  // Callback to refresh projects after accepting an invitation (so the new project appears)
  // We store a counter that Projects.tsx can watch via context — simpler: expose via a
  // top-level refresh trigger. Since Projects is a sibling, we use a simple callback ref
  // pattern: AppShell passes a refresh prop to its child if it's Projects, but that
  // would couple them tightly. Instead we use a lightweight approach: expose the
  // invitations state at the AppShell level and pass it down via a context or render prop.
  // For simplicity (matching the existing architecture which has no global state manager
  // beyond Zustand for board), we'll let Projects.tsx fetch its own data but trigger via
  // a shared refreshKey that increments after accept.
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);

  const handleAfterAccept = useCallback(() => {
    setProjectsRefreshKey(k => k + 1);
  }, []);

  const {
    invitations,
    pendingCount,
    loading: invLoading,
    error: invError,
    actioningId,
    refreshInvitations,
    syncInvitations,
    acceptInvitation,
    declineInvitation,
  } = useInvitations(handleAfterAccept);

  // Fetch invitations when the authenticated user is known
  useEffect(() => {
    if (user) {
      refreshInvitations();
    }
  }, [user]);

  // Always points at the latest refreshInvitations, so socket listeners
  // never call a stale copy
  const refreshInvitationsRef = useRef(refreshInvitations);
  refreshInvitationsRef.current = refreshInvitations;

    // Live updates: one socket for the whole app, connected as soon as we have a user
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket();

    // invite:received goes only to the invitee's personal room
    const handleInviteReceived = () => { syncInvitations(); };

    // invite:revoked also goes to the project room, so check it's about me
    const handleInviteRevoked = (data: { userId?: string }) => {
      if (data?.userId === user.id) syncInvitations();
    };

    // I accepted/declined in another tab
    const handleInviteResolved = (data: { accepted?: boolean }) => {
      syncInvitations();
      if (data?.accepted) handleAfterAccept(); // reload the projects list
    };

    // I was removed from a project
    const handleMemberRemoved = (data: { projectId?: string; userId?: string }) => {
      if (data?.userId !== user.id) return;
      handleAfterAccept(); // project disappears from All Projects
      if (data.projectId && data.projectId === projectId) {
        navigate('/projects'); // kick them off that project's pages
      }
    };

        // The project was deleted by its owner
    const handleProjectDeleted = (data: { projectId?: string }) => {
      handleAfterAccept(); // reload the projects list
      if (data?.projectId && data.projectId === projectId) {
        navigate('/projects');
      }
    };

    // I changed my name or username (in this tab or another one)
    const handleProfileUpdated = (data: { userId?: string; name?: string; username?: string | null }) => {
      if (data?.userId !== user.id || !data.name) return;
      setUser({ ...user, name: data.name, username: data.username ?? null });
    };

    // Events sent while offline are lost, so resync after a reconnect
    const handleReconnect = () => {
      syncInvitations();
      handleAfterAccept();
    };

    socket.on('invite:received', handleInviteReceived);
    socket.on('invite:revoked', handleInviteRevoked);
    socket.on('invite:resolved', handleInviteResolved);
    socket.on('member:removed', handleMemberRemoved);
    socket.on('project:deleted', handleProjectDeleted);
    socket.on('profile:updated', handleProfileUpdated);
    socket.io.on('reconnect', handleReconnect);

    return () => {
      socket.off('invite:received', handleInviteReceived);
      socket.off('invite:revoked', handleInviteRevoked);
      socket.off('invite:resolved', handleInviteResolved);
      socket.off('member:removed', handleMemberRemoved);
      socket.off('project:deleted', handleProjectDeleted);
      socket.off('profile:updated', handleProfileUpdated);
      socket.io.off('reconnect', handleReconnect);
    };
  }, [user?.id, projectId, handleAfterAccept, syncInvitations]);

  useEffect(() => {
    if (projectId) {
      projectsApi.get(projectId)
        .then((p) => {
          setProject(p);
          // Only remember projects that actually loaded, so a project the user can't open is never recorded
          if (user) rememberProject(user.id, p.id);
        })
        .catch(() => setProject(null));
    } else {
      setProject(null);
    }
  }, [projectId]);

  // Breadcrumb
  const isMembers = location.pathname.includes('/members');
  const isHome = location.pathname === '/home';
  const isProfile = location.pathname === '/profile';
  // The socket authenticated with the old user's cookie when it connected,
  // so it must be closed on logout or the next login would reuse it.
  const handleLogout = () => {
    disconnectSocket();
    logout();
  };

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
          <NavItem to="/home" icon={HomeIcon} label="Home" />
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
              <NavItem to={`/projects/${projectId}/chat`} icon={MessageSquare} label="Chat & AI" />
            </>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-[rgba(255,255,255,0.06)] shrink-0 space-y-2">
          <div className="flex items-center gap-1 rounded-lg group">
            <Link
              to="/profile"
              title="View your profile"
              className="flex-1 min-w-0 flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            >
              {user && <Avatar userId={user.id} name={user.name} size="sm" />}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate text-[#ECEAE4]">{user?.name}</div>
                <div className="text-[10px] text-[#5B616A] truncate">
                  {user?.username ? `@${user.username}` : user?.email}
                </div>
              </div>
            </Link>
            <button
              onClick={handleLogout}
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
              <span className="text-[#8A9099]">{isHome ? 'home' : isProfile ? 'profile' : 'projects'}</span>            
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
              {location.pathname.includes('/chat') && (
                <>
                  <span className="text-[#2A3040]">/</span>
                  <span className="text-[#5EE6B0]">chat</span>
                </>
              )}
            </div>
          </div>
          {/* Right side of topbar — notification bell */}
          <div className="flex items-center gap-2">
            {user && (
              <NotificationBell
                invitations={invitations}
                pendingCount={pendingCount}
                loading={invLoading}
                error={invError}
                actioningId={actioningId}
                onOpen={syncInvitations}
                onAccept={acceptInvitation}
                onDecline={declineInvitation}
                onRetry={refreshInvitations}
              />
            )}
          </div>
        </header>

        {/* Page content — pass refreshKey as prop so Projects can re-fetch after accept */}
        <main className="flex-1 overflow-hidden bg-[#0B0D10]">
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<any>, {
                _invitationsRefreshKey: projectsRefreshKey,
                _invitations: invitations,
                _actioningId: actioningId,
                _onAcceptInvite: acceptInvitation,
                _onDeclineInvite: declineInvitation,
              })
            : children}
        </main>
      </div>
    </div>
  );
}
