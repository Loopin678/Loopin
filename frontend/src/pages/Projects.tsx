import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectsApi, Project } from '../api/client';
import { FolderKanban, Plus, Loader2, Trash2, Clock, Edit2, X } from 'lucide-react';
import { cn } from '../utils/cn';

export function Projects() {
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

  // Rename state
  const [renameProject, setRenameProject] = useState<Project | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState('');

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

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
        <Loader2 className="animate-spin text-[#5EE6B0]" size={32} />
      </div>
    );
  }

  const stackOptions = ['Frontend', 'Backend', 'Fullstack', 'Mobile', 'DevOps', 'Data', 'Design'];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-8 max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#ECEAE4]">Your Projects</h1>
            <p className="text-sm text-[#8A9099] mt-1.5">
              {projects.length === 0
                ? 'No projects yet. Create your first workspace.'
                : `${projects.length} workspace${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#5EE6B0] text-black font-bold text-sm rounded-lg hover:bg-[#4CD59F] transition-colors shadow-sm shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Project
          </button>
        </div>

        {/* Empty State */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#111418] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-4">
              <FolderKanban size={28} className="text-[#5B616A]" />
            </div>
            <h3 className="text-lg font-bold text-[#ECEAE4]">No projects yet</h3>
            <p className="text-sm text-[#8A9099] mt-1 mb-6">
              Create a project to start planning your work in a loop.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#161A1F] text-[#ECEAE4] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm font-semibold hover:bg-[#1C2127] transition-colors"
            >
              <Plus size={16} /> Create first project
            </button>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project, index) => {
              const accentColors = ['#5EE6B0', '#7C7FE8', '#F59E0B', '#EF4444', '#06B6D4'];
              const accent = accentColors[index % accentColors.length];
              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="group relative bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 cursor-pointer hover:border-[rgba(255,255,255,0.12)] hover:bg-[#161A1F] transition-all"
                >
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ backgroundColor: accent }} />

                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}30` }}
                    >
                      <FolderKanban size={18} style={{ color: accent }} strokeWidth={2} />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={e => handleStartRename(e, project)}
                        className="p-1.5 rounded-lg text-[#5B616A] hover:text-[#ECEAE4] hover:bg-[#1C2127] transition-all"
                        title="Rename project"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={e => handleDelete(e, project.id)}
                        disabled={deleteId === project.id}
                        className="p-1.5 rounded-lg text-[#5B616A] hover:text-red-400 hover:bg-red-950/30 transition-all"
                        title="Delete project"
                      >
                        {deleteId === project.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-[#ECEAE4] mb-1 truncate">{project.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#5B616A] font-mono">
                    <Clock size={11} />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !creating && setShowCreate(false)}
          />
          <div className="relative w-full max-w-md bg-[#111418] border border-[rgba(255,255,255,0.10)] rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-[#ECEAE4] mb-1">New Project</h3>
            <p className="text-sm text-[#8A9099] mb-5">Give your workspace a name and tech focus.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              {createError && (
                <div className="p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
                  {createError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#8A9099] uppercase tracking-wider">
                  Project Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:border-[#5EE6B0] text-sm text-[#ECEAE4] transition-colors placeholder:text-[#5B616A]"
                  placeholder="e.g. Loopin v2, Campus App"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#8A9099] uppercase tracking-wider">
                  Tech Stack / Focus <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {stackOptions.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setNewProjectStack(opt)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                        newProjectStack === opt
                          ? "bg-[#5EE6B0] text-black"
                          : "bg-[#161A1F] text-[#8A9099] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
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
                  className="w-full px-3 py-2 bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:border-[#5EE6B0] text-sm text-[#ECEAE4] transition-colors placeholder:text-[#5B616A]"
                  placeholder="Or type a custom stack..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setNewProjectName(''); setCreateError(''); }}
                  className="px-4 py-2 text-sm font-medium text-[#8A9099] hover:text-[#ECEAE4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newProjectName.trim() || !newProjectStack.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-[#5EE6B0] text-black text-sm font-bold rounded-lg hover:bg-[#4CD59F] disabled:opacity-50 transition-colors"
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !renaming && setRenameProject(null)}
          />
          <div className="relative w-full max-w-sm bg-[#111418] border border-[rgba(255,255,255,0.10)] rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-[#ECEAE4] mb-1">Rename Project</h3>
            <p className="text-sm text-[#8A9099] mb-4">Enter a new name for this workspace.</p>

            <form onSubmit={handleRename} className="space-y-4">
              {renameError && (
                <div className="p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
                  {renameError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#8A9099] uppercase tracking-wider">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameName}
                  onChange={e => setRenameName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:border-[#5EE6B0] text-sm text-[#ECEAE4] transition-colors placeholder:text-[#5B616A]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameProject(null)}
                  className="px-4 py-2 text-sm font-medium text-[#8A9099] hover:text-[#ECEAE4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renaming || !renameName.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-[#5EE6B0] text-black text-sm font-bold rounded-lg hover:bg-[#4CD59F] disabled:opacity-50 transition-colors"
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