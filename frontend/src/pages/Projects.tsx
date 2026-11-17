import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectsApi, Project } from '../api/client';
import {
  FolderKanban, Plus, Loader2, Trash2, Clock, Edit2, X, Search, ArrowRight,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { projectCover, projectMonogram, timeAgo } from '../utils/projectStyle';

// Injected by AppShell via React.cloneElement. The key changes whenever something
// can change this user's project list: an invitation was accepted, they were
// removed from a project, or a project was deleted.
interface ProjectsProps {
  _invitationsRefreshKey?: number;
}

export function Projects({ _invitationsRefreshKey = 0 }: ProjectsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectStack, setNewProjectStack] = useState('Fullstack');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // Rename state
  const [renameProject, setRenameProject] = useState<Project | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState('');

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  // Re-fetch projects whenever an invitation is accepted (refreshKey increments)
  useEffect(() => {
    if (_invitationsRefreshKey > 0 && user) loadProjects();
  }, [_invitationsRefreshKey]);

  const loadProjects = async () => {
    if (!user) return;
    try {
      // GET /api/projects/user/:userId → 200 { projects: Project[] }
      const data = await projectsApi.listByUser(user.id);
      setProjects(data);
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjectName.trim()) return;
    if (!newProjectStack.trim()) {
      setCreateError('Stack/tech is required');
      return;
    }
    setCreateError('');
    setCreating(true);
    try {
      // POST /api/projects { name, userId, stack } → 201 { project }
      const project = await projectsApi.create({
        name: newProjectName.trim(),
        userId: user.id,
        stack: newProjectStack.trim(),
      });
      setProjects(prev => [...prev, project]);
      setShowCreate(false);
      setNewProjectName('');
      setNewProjectStack('Fullstack');
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleStartRename = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setRenameProject(project);
    setRenameName(project.name);
    setRenameError('');
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameProject || !renameName.trim()) return;
    setRenaming(true);
    setRenameError('');
    try {
      // PATCH /api/projects/:projectId { name } → 200 { project }
      const updated = await projectsApi.update(renameProject.id, { name: renameName.trim() });
      setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      setRenameProject(null);
    } catch (err: any) {
      setRenameError(err.message || 'Failed to rename project');
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this project? This cannot be undone.')) return;
    setDeleteId(id);
    try {
      // DELETE /api/projects/:projectId → 204
      await projectsApi.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-[#D0E36A]" size={32} />
      </div>
    );
  }

  const stackOptions = ['Frontend', 'Backend', 'Fullstack', 'Mobile', 'DevOps', 'Data', 'Design'];

  const q = query.trim().toLowerCase();
  const visibleProjects = q ? projects.filter(p => p.name.toLowerCase().includes(q)) : projects;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Page banner */}
        <section className="relative overflow-hidden rounded-[28px] dusk-sky animate-rise">
          <div className="absolute inset-x-0 bottom-0 h-[38%] hills opacity-70" aria-hidden />
          <div className="relative px-6 md:px-10 py-8 md:py-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-[#E2EE9C] bg-[#0B0C0A]/40 border border-[#D0E36A]/25">
                <FolderKanban size={12} className="text-[#D0E36A]" /> Workspaces
              </span>
              <h1 className="mt-4 text-3xl md:text-5xl font-semibold text-white">Your projects</h1>
              <p className="mt-2 text-sm md:text-base text-white/75">
                {projects.length === 0
                  ? 'No projects yet. Create your first workspace.'
                  : `${projects.length} workspace${projects.length !== 1 ? 's' : ''}, all in one loop.`}
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="group self-start md:self-auto inline-flex items-center gap-2 pl-4 pr-5 py-2.5 bg-[#D0E36A] text-[#0B0C0A] font-bold text-sm rounded-full hover:bg-[#BED158] hover:shadow-[0_0_28px_rgba(208,227,106,0.4)] transition-all shrink-0"
            >
              <Plus size={16} strokeWidth={2.5} className="transition-transform group-hover:rotate-90" />
              New project
            </button>
          </div>
        </section>

        {/* Search */}
        {projects.length > 0 && (
          <div className="animate-rise [animation-delay:100ms] relative max-w-md">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E7268]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search projects…"
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#151713] border border-white/10 text-sm text-white placeholder:text-[#6E7268] focus:outline-none focus:border-[#D0E36A]/60 focus:shadow-[0_0_0_4px_rgba(208,227,106,0.08)] transition-all"
            />
          </div>
        )}

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="animate-rise flex flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-[#151713]/50 py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-[22px] bg-[#D0E36A]/10 border border-[#D0E36A]/25 flex items-center justify-center mb-4 animate-pulse-glow">
              <FolderKanban size={28} className="text-[#D0E36A]" />
            </div>
            <h3 className="text-xl font-semibold text-white">No projects yet</h3>
            <p className="text-sm text-[#A1A69B] mt-1 mb-6">Create a project to start planning your work in a loop.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D0E36A] text-[#0B0C0A] rounded-full text-sm font-bold hover:bg-[#BED158] transition-colors"
            >
              <Plus size={16} /> Create first project
            </button>
          </div>
        )}

        {projects.length > 0 && visibleProjects.length === 0 && (
          <p className="text-sm text-[#A1A69B] px-1">No projects match “{query}”.</p>
        )}

        {/* Projects grid */}
        {visibleProjects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleProjects.map((project, index) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="animate-rise group relative cursor-pointer rounded-[24px] bg-[#151713] border border-white/5 p-2 hover:border-[#D0E36A]/30 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(208,227,106,0.35)] transition-all duration-300"
                style={{ animationDelay: `${120 + Math.min(index, 8) * 50}ms` }}
              >
                {/* Cover */}
                <div className={cn('relative h-28 rounded-[18px] overflow-hidden bg-gradient-to-br', projectCover(project.id))}>
                  <div className="absolute inset-x-0 bottom-0 h-2/3 hills opacity-60" aria-hidden />
                  <span className="absolute left-4 bottom-3 font-display text-3xl font-semibold text-white/90 drop-shadow transition-transform duration-500 group-hover:scale-110 origin-bottom-left">
                    {projectMonogram(project.name)}
                  </span>
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => handleStartRename(e, project)}
                      className="p-1.5 rounded-full bg-[#0B0C0A]/60 backdrop-blur text-white/80 hover:text-white hover:bg-[#0B0C0A]/80 transition-all"
                      title="Rename project"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={e => handleDelete(e, project.id)}
                      disabled={deleteId === project.id}
                      className="p-1.5 rounded-full bg-[#0B0C0A]/60 backdrop-blur text-white/80 hover:text-red-400 hover:bg-[#0B0C0A]/80 transition-all"
                      title="Delete project"
                    >
                      {deleteId === project.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="px-3 pt-3.5 pb-2.5">
                  <h3 className="font-display text-[17px] font-semibold text-white truncate group-hover:text-[#D0E36A] transition-colors">
                    {project.name}
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#6E7268]">
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} />
                      {timeAgo(project.createdAt)}
                    </span>
                    <span className="flex items-center gap-1 text-[#A1A69B] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                      Open <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* New project tile */}
            {!q && (
              <button
                onClick={() => setShowCreate(true)}
                className="group min-h-[190px] rounded-[24px] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-[#6E7268] hover:text-[#D0E36A] hover:border-[#D0E36A]/40 hover:bg-[#D0E36A]/[0.03] transition-all"
              >
                <span className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#D0E36A] group-hover:text-[#0B0C0A] transition-colors">
                  <Plus size={18} className="transition-transform group-hover:rotate-90" />
                </span>
                <span className="text-sm font-semibold">New project</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => !creating && setShowCreate(false)}
          />
          <div className="relative w-full max-w-md bg-[#151713] border border-[#D0E36A]/15 rounded-[28px] shadow-2xl shadow-black/60 p-6 animate-rise animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-semibold text-[#F4F5EF] mb-1">New project</h3>
            <p className="text-sm text-[#A1A69B] mb-5">Give your workspace a name and tech focus.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              {createError && (
                <div className="p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
                  {createError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#A1A69B] uppercase tracking-wider">
                  Project Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1B1E19] border border-[rgba(255,255,255,0.08)] rounded-xl focus:outline-none focus:border-[#D0E36A] text-sm text-[#F4F5EF] transition-colors placeholder:text-[#6E7268]"
                  placeholder="e.g. Loopin v2, Campus App"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#A1A69B] uppercase tracking-wider">
                  Tech Stack / Focus <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {stackOptions.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setNewProjectStack(opt)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold transition-all",
                        newProjectStack === opt
                          ? "bg-[#D0E36A] text-black"
                          : "bg-[#1B1E19] text-[#A1A69B] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={newProjectStack}
                  onChange={e => setNewProjectStack(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1B1E19] border border-[rgba(255,255,255,0.08)] rounded-xl focus:outline-none focus:border-[#D0E36A] text-sm text-[#F4F5EF] transition-colors placeholder:text-[#6E7268]"
                  placeholder="Or type a custom stack..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setNewProjectName(''); setCreateError(''); }}
                  className="px-4 py-2 text-sm font-medium text-[#A1A69B] hover:text-[#F4F5EF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newProjectName.trim() || !newProjectStack.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-[#D0E36A] text-black text-sm font-bold rounded-full hover:bg-[#BED158] disabled:opacity-50 transition-colors"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : null}
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Project Modal */}
      {renameProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => !renaming && setRenameProject(null)}
          />
          <div className="relative w-full max-w-sm bg-[#151713] border border-[#D0E36A]/15 rounded-[28px] shadow-2xl shadow-black/60 p-6 animate-rise animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-semibold text-[#F4F5EF] mb-1">Rename project</h3>
            <p className="text-sm text-[#A1A69B] mb-4">Enter a new name for this workspace.</p>

            <form onSubmit={handleRename} className="space-y-4">
              {renameError && (
                <div className="p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
                  {renameError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#A1A69B] uppercase tracking-wider">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameName}
                  onChange={e => setRenameName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1B1E19] border border-[rgba(255,255,255,0.08)] rounded-xl focus:outline-none focus:border-[#D0E36A] text-sm text-[#F4F5EF] transition-colors placeholder:text-[#6E7268]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameProject(null)}
                  className="px-4 py-2 text-sm font-medium text-[#A1A69B] hover:text-[#F4F5EF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renaming || !renameName.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-[#D0E36A] text-black text-sm font-bold rounded-full hover:bg-[#BED158] disabled:opacity-50 transition-colors"
                >
                  {renaming ? <Loader2 size={14} className="animate-spin" /> : null}
                  {renaming ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}