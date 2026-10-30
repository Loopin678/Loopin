import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  tasksApi,
  projectsApi,
  ApiError,
  MyTask,
  Project,
  ListKind,
  PendingInvitation,
} from '../api/client';
import { getRecentProjectIds } from '../utils/recentProjects';
import {
  Loader2, FolderKanban, CheckCircle2, XCircle, ArrowRight, Inbox, Bell, AlertCircle,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { connectSocket } from '../api/socket';

// Props injected by AppShell (the same mechanism the Projects page uses)
interface HomeProps {
  _invitationsRefreshKey?: number;
  _invitations?: PendingInvitation[];
  _actioningId?: string | null;
  _onAcceptInvite?: (inv: PendingInvitation) => void;
  _onDeclineInvite?: (inv: PendingInvitation) => void;
}

// The chip shows the list's own name, coloured by its kind (so renamed lists keep their colour)
const KIND_STYLES: Record<ListKind, string> = {
  TODO: 'text-[#8A9099] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]',
  IN_PROGRESS: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30',
  DONE: 'text-[#5EE6B0] bg-[#5EE6B0]/10 border-[#5EE6B0]/25',
  CUSTOM: 'text-[#7C7FE8] bg-[#7C7FE8]/10 border-[#7C7FE8]/30',
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Home({
  _invitationsRefreshKey = 0,
  _invitations = [],
  _actioningId = null,
  _onAcceptInvite,
  _onDeclineInvite,
}: HomeProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState('');
  const [showDone, setShowDone] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // ── My tasks ──────────────────────────────────────────────────────────────

  const loadTasks = useCallback(
    async (silent = false) => {
      if (!silent) setTasksLoading(true);
      setTasksError('');
      try {
        setTasks(await tasksApi.mine(showDone));
      } catch (err) {
        setTasksError(err instanceof ApiError ? err.message : 'Failed to load your tasks');
      } finally {
        setTasksLoading(false);
      }
    },
    [showDone]
  );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Quietly refresh when the user comes back to this tab
  useEffect(() => {
    const onFocus = () => loadTasks(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadTasks]);

    // Live updates: the server nudges us when something that affects "My tasks" changes
  useEffect(() => {
    const socket = connectSocket();
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Several events can arrive back to back (assign + move), so wait a moment and refetch once
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadTasks(true), 300);
    };

    socket.on('my-tasks:changed', refresh);
    socket.io.on('reconnect', refresh); // events sent while we were offline are lost, so resync

    return () => {
      clearTimeout(timer);
      socket.off('my-tasks:changed', refresh);
      socket.io.off('reconnect', refresh);
    };
  }, [loadTasks]);

  // AppShell bumps this key when a member is removed, a project is deleted
  // or an invitation is accepted: any of them can change which tasks are yours
  useEffect(() => {
    if (_invitationsRefreshKey > 0) loadTasks(true);
  }, [_invitationsRefreshKey]);

  // ── Projects (also reloads after an invitation is accepted) ───────────────

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    projectsApi
      .listByUser(user.id)
      .then((p) => { if (!cancelled) setProjects(p); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setProjectsLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, _invitationsRefreshKey]);

  // ── Derived data ──────────────────────────────────────────────────────────

  // The server already sorts by project, so grouping keeps that order
  const groups = useMemo(() => {
    const byProject = new Map<string, { project: MyTask['project']; tasks: MyTask[] }>();
    for (const task of tasks) {
      const group = byProject.get(task.project.id);
      if (group) group.tasks.push(task);
      else byProject.set(task.project.id, { project: task.project, tasks: [task] });
    }
    return Array.from(byProject.values());
  }, [tasks]);

  // Most recently opened first, everything else keeps the server's order (newest first)
  const recentProjects = useMemo(() => {
    const order = user ? getRecentProjectIds(user.id) : [];
    const rank = (id: string) => {
      const index = order.indexOf(id);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    return [...projects].sort((a, b) => rank(a.id) - rank(b.id)).slice(0, 4);
  }, [projects, user]);

  const firstName = user?.name.trim().split(/\s+/)[0] ?? 'there';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-8 max-w-6xl mx-auto">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#ECEAE4]">
            {greeting()}, {firstName}
          </h1>
          <p className="text-sm text-[#8A9099] mt-1.5">{today}</p>
        </div>

        {/* Invitations: only shown when there are some */}
        {_invitations.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={14} className="text-[#5EE6B0]" />
              <h2 className="text-sm font-bold text-[#ECEAE4] uppercase tracking-wider">Invitations</h2>
              <span className="px-1.5 py-0.5 rounded-full bg-[#5EE6B0]/15 text-[#5EE6B0] text-[10px] font-mono font-bold">
                {_invitations.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {_invitations.map((inv) => {
                const isActioning = _actioningId === inv.id;
                return (
                  <div
                    key={inv.id}
                    className="bg-[#111418] border border-[#5EE6B0]/20 rounded-xl p-4 flex flex-col gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#ECEAE4] truncate">{inv.project.name}</p>
                      <p className="text-xs text-[#8A9099] mt-0.5">You've been invited to join this project</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => _onDeclineInvite?.(inv)}
                        disabled={isActioning}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] text-xs font-semibold text-[#5B616A] hover:text-red-400 hover:border-red-900/40 disabled:opacity-40 transition-all"
                      >
                        {isActioning ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                        Decline
                      </button>
                      <button
                        onClick={() => _onAcceptInvite?.(inv)}
                        disabled={isActioning}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#5EE6B0]/15 border border-[#5EE6B0]/30 text-xs font-bold text-[#5EE6B0] hover:bg-[#5EE6B0]/25 disabled:opacity-40 transition-all"
                      >
                        {isActioning ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Accept
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* My tasks */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#ECEAE4] uppercase tracking-wider">My tasks</h2>
              {tasks.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#5EE6B0]/15 text-[#5EE6B0] text-[10px] font-mono font-bold">
                  {tasks.length}
                </span>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-[#8A9099] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDone}
                onChange={(e) => setShowDone(e.target.checked)}
                className="accent-[#5EE6B0]"
              />
              Show completed
            </label>
          </div>

          {tasksLoading && (
            <div className="flex items-center gap-2 py-6 text-[#5B616A]">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">Loading your tasks…</span>
            </div>
          )}

          {!tasksLoading && tasksError && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-xl">
              <AlertCircle size={14} className="shrink-0" />
              <span className="flex-1 text-xs">{tasksError}</span>
              <button onClick={() => loadTasks()} className="text-xs text-[#5EE6B0] hover:underline shrink-0">
                Retry
              </button>
            </div>
          )}

          {!tasksLoading && !tasksError && tasks.length === 0 && (
            <div className="bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-6 flex items-center gap-3 text-[#5B616A]">
              <Inbox size={18} />
              <div>
                <p className="text-sm text-[#8A9099]">Nothing assigned to you right now</p>
                <p className="text-xs mt-0.5">Tasks assigned to you will show up here.</p>
              </div>
            </div>
          )}

          {!tasksLoading && !tasksError &&
            groups.map((group) => (
              <div
                key={group.project.id}
                className="bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-xl mb-3 overflow-hidden"
              >
                <button
                  onClick={() => navigate(`/projects/${group.project.id}`)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#161A1F] border-b border-[rgba(255,255,255,0.06)] hover:bg-[#1C2127] transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <FolderKanban size={14} className="text-[#5B616A] shrink-0" />
                    <span className="text-sm font-semibold text-[#ECEAE4] truncate">{group.project.name}</span>
                  </span>
                  <span className="text-xs font-mono text-[#5B616A]">{group.tasks.length}</span>
                </button>
                <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {group.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => navigate(`/projects/${task.project.id}/tasks/${task.id}`)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#161A1F] transition-colors"
                    >
                      <span className="text-sm text-[#ECEAE4] truncate">{task.title}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        {task.stack && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-[#8A9099]">
                            {task.stack}
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-[10px] font-mono px-2 py-0.5 rounded-full border',
                            KIND_STYLES[task.list.kind]
                          )}
                        >
                          {task.list.name}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </section>

        {/* Continue where you left off */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#ECEAE4] uppercase tracking-wider">
              Continue where you left off
            </h2>
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-1 text-xs text-[#8A9099] hover:text-[#ECEAE4] transition-colors"
            >
              All projects <ArrowRight size={12} />
            </button>
          </div>

          {projectsLoading && (
            <div className="flex items-center gap-2 py-6 text-[#5B616A]">
              <Loader2 size={14} className="animate-spin" />
            </div>
          )}

          {!projectsLoading && projects.length === 0 && (
            <div className="bg-[#111418] border border-dashed border-[rgba(255,255,255,0.10)] rounded-xl px-4 py-8 text-center">
              <p className="text-sm text-[#ECEAE4] font-semibold">Start your first project</p>
              <p className="text-xs text-[#8A9099] mt-1 mb-4">
                Create a workspace, or accept an invitation to join one.
              </p>
              <button
                onClick={() => navigate('/projects')}
                className="px-4 py-2 bg-[#5EE6B0] text-black text-sm font-bold rounded-lg hover:bg-[#4CD59F] transition-colors"
              >
                Go to Projects
              </button>
            </div>
          )}

          {recentProjects.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="text-left bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#161A1F] transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#5EE6B0]/10 border border-[#5EE6B0]/20 flex items-center justify-center mb-3">
                    <FolderKanban size={15} className="text-[#5EE6B0]" />
                  </div>
                  <p className="text-sm font-bold text-[#ECEAE4] truncate">{project.name}</p>
                  <p className="text-xs text-[#5B616A] font-mono mt-1">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}