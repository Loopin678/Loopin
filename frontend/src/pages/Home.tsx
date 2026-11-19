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
  Sparkles, ListChecks, CircleDot, ChevronRight, Plus,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { connectSocket } from '../api/socket';
import { projectCover, projectMonogram, timeAgo } from '../utils/projectStyle';
import { ProjectCover } from '../components/projects/ProjectCover';

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
  TODO: 'text-[#A1A69B] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]',
  IN_PROGRESS: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30',
  DONE: 'text-[#D0E36A] bg-[#D0E36A]/10 border-[#D0E36A]/25',
  CUSTOM: 'text-[#7C7FE8] bg-[#7C7FE8]/10 border-[#7C7FE8]/30',
};

// Small status dot per list kind
const KIND_DOT: Record<ListKind, string> = {
  TODO: 'bg-white/40',
  IN_PROGRESS: 'bg-[#F59E0B]',
  DONE: 'bg-[#D0E36A]',
  CUSTOM: 'bg-[#7C7FE8]',
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

  const openTasks = tasks.filter((t) => t.list.kind !== 'DONE').length;
  const inProgress = tasks.filter((t) => t.list.kind === 'IN_PROGRESS').length;
  const summary =
    tasksLoading
      ? 'Getting your day ready…'
      : openTasks === 0
        ? 'Your plate is clear. A good moment to plan what’s next.'
        : `You have ${openTasks} open task${openTasks !== 1 ? 's' : ''}${inProgress ? `, ${inProgress} already in progress` : ''}.`;

  const stats = [
    { icon: ListChecks, label: 'Open tasks', value: tasksLoading ? '–' : openTasks },
    { icon: CircleDot, label: 'In progress', value: tasksLoading ? '–' : inProgress },
    { icon: FolderKanban, label: 'Projects', value: projectsLoading ? '–' : projects.length },
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Welcome banner */}
        <section className="relative overflow-hidden rounded-[28px] dusk-sky animate-rise">
          <div className="absolute inset-x-0 bottom-0 h-2/3 hills opacity-80" aria-hidden />
          <div className="relative px-6 md:px-10 pt-8 md:pt-10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-[#E2EE9C] bg-[#0B0C0A]/40 border border-[#D0E36A]/25">
                <Sparkles size={12} className="text-[#D0E36A]" /> {today}
              </span>
              <h1 className="mt-4 text-3xl md:text-5xl font-semibold text-white leading-tight">
                {greeting()},{' '}
                <span className="bg-gradient-to-r from-[#EEF7B8] via-[#D0E36A] to-[#A9C24A] bg-clip-text text-transparent">
                  {firstName}
                </span>
              </h1>
              <p className="mt-2 text-sm md:text-base text-white/75">{summary}</p>
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="group self-start md:self-auto inline-flex items-center gap-3 rounded-full pl-5 pr-1.5 py-1.5 bg-[#0B0C0A]/80 border border-white/10 text-sm font-semibold text-white hover:bg-[#0B0C0A] transition-colors shrink-0"
            >
              Open projects
              <span className="w-8 h-8 rounded-full bg-[#D0E36A] text-[#0B0C0A] flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight size={15} />
              </span>
            </button>
          </div>
          <div className="relative grid grid-cols-3 gap-2 md:gap-3 px-4 md:px-10 pb-6 md:pb-8">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="animate-rise rounded-2xl bg-[#0B0C0A]/75 backdrop-blur-md border border-white/10 p-3 md:p-4"
                style={{ animationDelay: `${120 + i * 80}ms` }}
              >
                <div className="flex items-center gap-2 text-[11px] md:text-xs text-white/60">
                  <s.icon size={13} className="text-[#D0E36A] shrink-0" />
                  <span className="truncate">{s.label}</span>
                </div>
                <p className="mt-1.5 font-display text-2xl md:text-3xl font-semibold text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Invitations: only shown when there are some */}
        {_invitations.length > 0 && (
          <section className="animate-rise rounded-[24px] border border-[#D0E36A]/25 bg-gradient-to-br from-[#1F2A0E]/60 to-[#151713] p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-xl bg-[#D0E36A] text-[#0B0C0A] flex items-center justify-center animate-pulse-glow">
                <Bell size={15} />
              </span>
              <h2 className="text-lg font-semibold text-white">Invitations</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#D0E36A]/15 text-[#D0E36A] text-xs font-semibold">
                {_invitations.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {_invitations.map((inv) => {
                const isActioning = _actioningId === inv.id;
                return (
                  <div key={inv.id} className="rounded-2xl bg-[#0B0C0A]/60 border border-white/10 p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center font-display text-sm font-semibold text-white shrink-0', projectCover(inv.project.id))}>
                        {projectMonogram(inv.project.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{inv.project.name}</p>
                        <p className="text-xs text-[#A1A69B] mt-0.5">You’ve been invited to join</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => _onDeclineInvite?.(inv)}
                        disabled={isActioning}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full border border-white/10 text-xs font-semibold text-[#A1A69B] hover:text-red-400 hover:border-red-900/50 disabled:opacity-40 transition-all"
                      >
                        {isActioning ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                        Decline
                      </button>
                      <button
                        onClick={() => _onAcceptInvite?.(inv)}
                        disabled={isActioning}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-[#D0E36A] text-xs font-bold text-[#0B0C0A] hover:bg-[#BED158] disabled:opacity-40 transition-all"
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

        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          {/* My tasks */}
          <section className="animate-rise rounded-[24px] bg-[#151713] border border-white/5 p-4 md:p-5 [animation-delay:150ms]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">My tasks</h2>
                {tasks.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#D0E36A]/15 text-[#D0E36A] text-xs font-semibold">
                    {tasks.length}
                  </span>
                )}
              </div>
              {/* Pill switch for completed tasks */}
              <button
                type="button"
                role="switch"
                aria-checked={showDone}
                onClick={() => setShowDone((v) => !v)}
                className="flex items-center gap-2 text-xs text-[#A1A69B] hover:text-white transition-colors"
              >
                Show completed
                <span className={cn('relative w-9 h-5 rounded-full transition-colors', showDone ? 'bg-[#D0E36A]' : 'bg-white/10')}>
                  <span className={cn('absolute top-0.5 w-4 h-4 rounded-full transition-all', showDone ? 'left-[18px] bg-[#0B0C0A]' : 'left-0.5 bg-white/70')} />
                </span>
              </button>
            </div>

            {tasksLoading && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-2xl bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            )}

            {!tasksLoading && tasksError && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-2xl">
                <AlertCircle size={14} className="shrink-0" />
                <span className="flex-1 text-xs">{tasksError}</span>
                <button onClick={() => loadTasks()} className="text-xs text-[#D0E36A] hover:underline shrink-0">
                  Retry
                </button>
              </div>
            )}

            {!tasksLoading && !tasksError && tasks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 flex flex-col items-center text-center">
                <span className="w-12 h-12 rounded-2xl bg-[#D0E36A]/10 border border-[#D0E36A]/20 flex items-center justify-center text-[#D0E36A]">
                  <Inbox size={20} />
                </span>
                <p className="mt-3 text-sm font-semibold text-white">Nothing assigned to you right now</p>
                <p className="text-xs text-[#A1A69B] mt-1">Tasks assigned to you will show up here.</p>
              </div>
            )}

            {!tasksLoading && !tasksError && (
              <div className="space-y-4">
                {groups.map((group) => (
                  <div key={group.project.id}>
                    <button
                      onClick={() => navigate(`/projects/${group.project.id}`)}
                      className="group w-full flex items-center gap-2.5 mb-2 px-1 text-left"
                    >
                      <span className={cn('w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center text-[10px] font-semibold text-white shrink-0', projectCover(group.project.id))}>
                        {projectMonogram(group.project.name)}
                      </span>
                      <span className="text-sm font-semibold text-white truncate group-hover:text-[#D0E36A] transition-colors">
                        {group.project.name}
                      </span>
                      <span className="text-xs text-[#6E7268]">{group.tasks.length}</span>
                      <ChevronRight size={14} className="ml-auto text-[#6E7268] group-hover:text-[#D0E36A] group-hover:translate-x-0.5 transition-all" />
                    </button>
                    <div className="space-y-1.5">
                      {group.tasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => navigate(`/projects/${task.project.id}/tasks/${task.id}`)}
                          className="group w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1B1E19] border border-transparent text-left hover:border-[#D0E36A]/25 hover:bg-[#1F231C] hover:-translate-y-px transition-all"
                        >
                          <span className={cn('w-2 h-2 rounded-full shrink-0', KIND_DOT[task.list.kind])} />
                          <span
                            className={cn(
                              'flex-1 text-sm truncate',
                              task.list.kind === 'DONE' ? 'text-[#6E7268] line-through' : 'text-white'
                            )}
                          >
                            {task.title}
                          </span>
                          {task.stack && (
                            <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wide text-[#A1A69B]">
                              {task.stack}
                            </span>
                          )}
                          <span className={cn('text-[11px] px-2.5 py-0.5 rounded-full border shrink-0', KIND_STYLES[task.list.kind])}>
                            {task.list.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Continue where you left off */}
          <aside className="animate-rise rounded-[24px] bg-[#151713] border border-white/5 p-4 md:p-5 [animation-delay:220ms]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Jump back in</h2>
              <button
                onClick={() => navigate('/projects')}
                className="flex items-center gap-1 text-xs text-[#A1A69B] hover:text-[#D0E36A] transition-colors"
              >
                All <ArrowRight size={12} />
              </button>
            </div>

            {projectsLoading && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            )}

            {!projectsLoading && projects.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center">
                <p className="text-sm text-white font-semibold">Start your first project</p>
                <p className="text-xs text-[#A1A69B] mt-1 mb-4">Create a workspace, or accept an invitation to join one.</p>
                <button
                  onClick={() => navigate('/projects')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D0E36A] text-[#0B0C0A] text-sm font-bold rounded-full hover:bg-[#BED158] transition-colors"
                >
                  <Plus size={14} /> New project
                </button>
              </div>
            )}

            <div className="space-y-2">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="group w-full flex items-center gap-3 p-2.5 rounded-2xl text-left hover:bg-[#1B1E19] transition-colors"
                >
                  <ProjectCover
                    projectId={project.id}
                    name={project.name}
                    cover={project.cover}
                    hills={false}
                    className="w-11 h-11 rounded-xl shrink-0 transition-transform group-hover:scale-105"
                    monogramClassName="absolute inset-0 flex items-center justify-center text-sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white truncate group-hover:text-[#D0E36A] transition-colors">
                      {project.name}
                    </span>
                    <span className="block text-xs text-[#6E7268] mt-0.5">Created {timeAgo(project.createdAt)}</span>
                  </span>
                  <ChevronRight size={15} className="text-[#6E7268] group-hover:text-[#D0E36A] group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
