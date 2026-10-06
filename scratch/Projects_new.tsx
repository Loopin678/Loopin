import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectsService } from '../services/projects';
import { Project } from '../types';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { 
  FolderKanban, Plus, LogOut, ChevronRight, Loader2, Command, X, ArrowRight, 
  Activity, Sparkles, LayoutGrid, List as ListIcon, Box, Search, Filter, 
  Star, MoreVertical, Play, CheckCircle2, Clock, PauseCircle, Edit2, Copy, 
  Share2, Trash2, History, MessageSquare, FileText
} from 'lucide-react';
import { cn } from '../utils/cn';

// --- Types & Presentation Mocks ---
type ViewMode = 'orbit' | 'grid' | 'list';
type ProjectStatus = 'Active' | 'Draft' | 'Paused' | 'Completed';

interface PresentationData {
  status: ProjectStatus;
  progress: number;
  collaborators: number;
  updatedAt: Date;
}

// Generate consistent presentation data based on project ID
function getPresentationData(id: string, createdAt: string): PresentationData {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const statuses: ProjectStatus[] = ['Active', 'Active', 'Draft', 'Paused', 'Completed', 'Active'];
  const status = statuses[hash % statuses.length];
  
  let progress = 0;
  if (status === 'Completed') progress = 100;
  else if (status === 'Active') progress = (hash % 80) + 10;
  else if (status === 'Paused') progress = (hash % 50) + 20;

  const collaborators = (hash % 5) + 1;
  
  // Make some projects updated more recently
  const updated = new Date(createdAt);
  updated.setHours(updated.getHours() + (hash % 48));

  return { status, progress, collaborators, updatedAt: updated };
}

// --- Main Page Component ---
export function Projects() {
  const { user, setUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View & Filters
  const [viewMode, setViewMode] = useState<ViewMode>('orbit');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'All'>('All');
  const [sortMode, setSortMode] = useState<'Newest' | 'Oldest' | 'Name' | 'Progress'>('Newest');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  
  // UI State
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (user) loadProjects();
    const savedPins = localStorage.getItem('loopin_pinned_projects');
    if (savedPins) setPinnedIds(JSON.parse(savedPins));
  }, [user]);

  const loadProjects = async () => {
    try {
      if (!user) return;
      const data = await projectsService.getProjectsByUser(user.id);
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newPins = pinnedIds.includes(id) ? pinnedIds.filter(p => p !== id) : [...pinnedIds, id];
    setPinnedIds(newPins);
    localStorage.setItem('loopin_pinned_projects', JSON.stringify(newPins));
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      // Presentation only - if no backend delete exists, we just filter local state
      // Assume no backend delete since we can't invent it, we just remove locally for presentation
      setProjects(projects.filter(p => p.id !== id));
      if (pinnedIds.includes(id)) {
         setPinnedIds(pinnedIds.filter(p => p !== id));
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjectName.trim()) return;
    setCreating(true);
    try {
      const newProject = await projectsService.createProject(newProjectName, user.id, 'fullstack');
      setProjects([...projects, newProject]);
      setIsCreating(false);
      setNewProjectName('');
      navigate(`/projects/${newProject.id}`);
    } catch (error) {
      console.error('Failed to create project', error);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error(error);
    }
  }

  // --- Processed Data ---
  const processedProjects = useMemo(() => {
    return projects.map(p => ({ ...p, ...getPresentationData(p.id, p.createdAt) }));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return processedProjects
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(p => statusFilter === 'All' || p.status === statusFilter)
      .sort((a, b) => {
        if (sortMode === 'Newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortMode === 'Oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortMode === 'Name') return a.name.localeCompare(b.name);
        if (sortMode === 'Progress') return b.progress - a.progress;
        return 0;
      });
  }, [processedProjects, searchQuery, statusFilter, sortMode]);

  const pinnedProjects = processedProjects.filter(p => pinnedIds.includes(p.id));
  const activeFiltersCount = (searchQuery ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-500 gap-4">
        <Loader2 size={32} className="animate-spin text-violet-600" />
        <p className="font-medium text-sm">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Signature Navbar */}
      <nav className="relative z-50 w-full max-w-[1600px] mx-auto pt-4 px-4 sm:px-8">
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-400 translate-x-0.5 translate-y-0.5 rounded-lg opacity-50" />
              <div className="relative bg-violet-600 p-2 rounded-lg text-white shadow-sm hover:-rotate-2 transition-transform">
                <Command size={18} strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="text-xl font-display font-black tracking-tight text-slate-900">Loopin.</h1>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50/50 rounded-full border border-emerald-100/50">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-xs font-bold text-emerald-700">Workspace Active</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-bold text-slate-700 hidden sm:block">{user?.name}</span>
            </div>
            <button 
              onClick={handleLogout} 
              title="Logout"
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <LogOut size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-8 py-8 flex flex-col lg:flex-row gap-8 relative z-10">
        
        {/* Left/Center Column: Controls, Pinned, Projects */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight text-slate-900">
                Your Projects
              </h2>
              <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
                <FolderKanban size={16} className="text-violet-500" />
                {processedProjects.length} total projects across your workspace.
              </p>
            </div>
            
            {/* View Switcher */}
            <div className="flex items-center bg-white/80 backdrop-blur-sm border border-slate-200/60 p-1 rounded-xl shadow-sm">
              {(['orbit', 'grid', 'list'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "p-2 rounded-lg flex items-center justify-center transition-all focus:outline-none",
                    viewMode === mode ? "bg-white shadow-sm text-violet-600 font-bold" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  )}
                  title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} View`}
                >
                  {mode === 'orbit' && <Box size={18} strokeWidth={viewMode === mode ? 2.5 : 2} />}
                  {mode === 'grid' && <LayoutGrid size={18} strokeWidth={viewMode === mode ? 2.5 : 2} />}
                  {mode === 'list' && <ListIcon size={18} strokeWidth={viewMode === mode ? 2.5 : 2} />}
                </button>
              ))}
            </div>
          </div>

          {/* Control Bar */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-2 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search projects..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50/50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white text-sm font-semibold text-slate-900 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>
            
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-6 w-px bg-slate-200 mx-1" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'All')}
                className="bg-slate-50/50 border border-transparent hover:border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Paused">Paused</option>
                <option value="Completed">Completed</option>
              </select>

              <select 
                value={sortMode} 
                onChange={(e) => setSortMode(e.target.value as any)}
                className="bg-slate-50/50 border border-transparent hover:border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 cursor-pointer"
              >
                <option value="Newest">Newest first</option>
                <option value="Oldest">Oldest first</option>
                <option value="Name">Name (A-Z)</option>
                <option value="Progress">Progress</option>
              </select>
            </div>
            
            {activeFiltersCount > 0 && (
              <button 
                onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
                className="text-xs font-bold text-violet-600 hover:text-violet-700 px-3 py-2 flex items-center gap-1"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Pinned Projects */}
          {pinnedProjects.length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Star size={12} className="text-amber-400 fill-amber-400" /> Pinned
              </h3>
              <div className="flex flex-wrap gap-3">
                {pinnedProjects.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="flex items-center gap-3 px-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FolderKanban size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">{p.name}</h4>
                      <p className="text-[11px] font-semibold text-slate-500">{p.status}</p>
                    </div>
                    <button 
                      onClick={(e) => togglePin(e, p.id)}
                      className="ml-2 text-amber-400 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main View Area */}
          <div className="flex-1 relative min-h-[500px] w-full">
            {filteredProjects.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-white/40 backdrop-blur-md rounded-3xl border-2 border-dashed border-slate-200 z-10">
                <Search size={32} className="text-slate-300 mb-3" />
                <h3 className="text-lg font-bold text-slate-900">No projects found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">Try adjusting your filters or search query to find what you're looking for.</p>
                <button 
                  onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
                  className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-black transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : viewMode === 'orbit' ? (
              <ProjectCarousel 
                projects={filteredProjects} 
                onSelect={(id) => navigate(`/projects/${id}`)}
                onPin={togglePin}
                onDelete={handleDelete}
                pinnedIds={pinnedIds}
              />
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 pb-8 relative z-10">
                {filteredProjects.map((p, i) => (
                  <ProjectCard 
                    key={p.id} project={p} index={i}
                    onSelect={() => navigate(`/projects/${p.id}`)}
                    onPin={(e: any) => togglePin(e, p.id)} onDelete={(e: any) => handleDelete(e, p.id)}
                    isPinned={pinnedIds.includes(p.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 pb-8 relative z-10">
                {filteredProjects.map((p, i) => (
                  <ProjectRow 
                    key={p.id} project={p} 
                    onSelect={() => navigate(`/projects/${p.id}`)}
                    onPin={(e: any) => togglePin(e, p.id)} onDelete={(e: any) => handleDelete(e, p.id)}
                    isPinned={pinnedIds.includes(p.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions & Activity */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col gap-6 lg:pt-2 relative z-20">
          
          {/* Quick Actions & Templates */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => setIsCreating(!isCreating)}
              className="group relative flex items-center justify-center gap-3 w-full bg-violet-600 text-white py-4 rounded-2xl shadow-[0_8px_20px_rgba(124,58,237,0.25)] hover:bg-violet-700 hover:-translate-y-0.5 transition-all focus:outline-none overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform shadow-inner">
                <Plus size={18} strokeWidth={2.5} />
              </div>
              <span className="relative z-10 font-bold text-lg">New Project</span>
            </button>

            <div className={cn(
              "overflow-hidden transition-all duration-400 ease-in-out origin-top",
              isCreating ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
            )}>
              <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-sm">
                <form onSubmit={handleCreate} className="flex flex-col gap-3">
                  <div className="relative">
                    <Sparkles size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" />
                    <input
                      type="text" autoFocus={isCreating}
                      placeholder="Workspace name..."
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 bg-slate-50/50 border border-slate-200/50 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-bold text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setIsCreating(false); setNewProjectName(''); }} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={creating || !newProjectName.trim()} className="flex-1 px-4 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {creating ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
                      {!creating && <ArrowRight size={16} />}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <FolderKanban size={12} /> Start from Template
              </h4>
              <div className="flex flex-col gap-2">
                {[
                  { name: 'Blank Project', cat: 'Basic', color: 'bg-slate-500' },
                  { name: 'Product Launch', cat: 'Marketing', color: 'bg-emerald-500' },
                  { name: 'Design Sprint', cat: 'Design', color: 'bg-rose-500' },
                  { name: 'Content Calendar', cat: 'Media', color: 'bg-cyan-500' }
                ].map(t => (
                  <button key={t.name} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all group text-left w-full focus:outline-none">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform", t.color)}>
                      <LayoutGrid size={14} strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 group-hover:text-violet-600 transition-colors">{t.name}</div>
                      <div className="text-[10px] font-semibold text-slate-400">{t.cat}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity Panel */}
          <div className="bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 shadow-sm flex-1 mb-8">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <History size={12} /> Workspace Activity
            </h4>
            <div className="flex flex-col gap-5 relative">
              <div className="absolute left-3.5 top-2 bottom-2 w-px bg-slate-200/60 -z-10" />
              {processedProjects.slice(0, 5).map((p, i) => {
                // Generate deterministic fake activity purely for presentation
                const hash = p.id.charCodeAt(0) + i;
                const activities = [
                  { icon: MessageSquare, text: 'commented on a task', user: 'Alex M.', color: 'text-blue-500', bg: 'bg-blue-50' },
                  { icon: CheckCircle2, text: 'completed a milestone', user: 'You', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                  { icon: FileText, text: 'uploaded a document', user: 'Sarah K.', color: 'text-amber-500', bg: 'bg-amber-50' },
                  { icon: Plus, text: 'created this project', user: 'You', color: 'text-violet-500', bg: 'bg-violet-50' }
                ];
                const act = activities[hash % activities.length];

                return (
                  <div key={p.id + i} className="flex items-start gap-3 group">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center mt-0.5 shadow-sm border border-white flex-shrink-0 z-10", act.bg, act.color)}>
                      <act.icon size={12} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 font-medium leading-tight">
                        <strong className="text-slate-900">{act.user}</strong> {act.text} in <strong className="text-slate-900 hover:text-violet-600 cursor-pointer">{p.name}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400 font-semibold mt-1">
                        {Math.max(1, (i * 2) + 1)} hours ago
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// -----------------------------------------
// Helpers for Project Presentation
// -----------------------------------------

const StatusBadge = ({ status }: { status: ProjectStatus }) => {
  const styles = {
    Active: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    Draft: 'bg-amber-50 text-amber-600 border-amber-200',
    Paused: 'bg-orange-50 text-orange-600 border-orange-200',
    Completed: 'bg-violet-50 text-violet-600 border-violet-200',
  };
  const icons = {
    Active: <Play size={10} className="mr-1 inline" />,
    Draft: <Edit2 size={10} className="mr-1 inline" />,
    Paused: <PauseCircle size={10} className="mr-1 inline" />,
    Completed: <CheckCircle2 size={10} className="mr-1 inline" />,
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider flex items-center w-fit", styles[status])}>
      {icons[status]} {status}
    </span>
  );
};

const QuickMenu = ({ 
  onSelect, onDelete, onPin, isPinned 
}: { 
  onSelect: () => void, onDelete: (e: React.MouseEvent) => void, onPin: (e: React.MouseEvent) => void, isPinned: boolean 
}) => {
  const [open, setOpen] = useState(false);
  
  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button 
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <button onClick={() => { setOpen(false); onSelect(); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <ArrowRight size={14} /> Open
          </button>
          <button onClick={(e) => { setOpen(false); onPin(e); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <Star size={14} className={isPinned ? "fill-amber-400 text-amber-400" : ""} /> {isPinned ? 'Unpin' : 'Pin to top'}
          </button>
          <button onClick={() => setOpen(false)} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50" disabled>
            <Copy size={14} /> Duplicate
          </button>
          <button onClick={() => setOpen(false)} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50" disabled>
            <Share2 size={14} /> Share
          </button>
          <div className="h-px bg-slate-100 my-1" />
          <button onClick={(e) => { setOpen(false); onDelete(e); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------
// Grid & List View Components
// -----------------------------------------

function ProjectCard({ project, index, onSelect, onPin, onDelete, isPinned }: any) {
  const themeColors = ['bg-violet-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-rose-500', 'bg-fuchsia-500'];
  const color = themeColors[index % themeColors.length];
  
  return (
    <div 
      onClick={onSelect}
      className="bg-white border border-slate-200/80 rounded-2xl p-5 cursor-pointer hover:shadow-xl hover:shadow-slate-200/50 hover:border-violet-200 transition-all duration-300 group flex flex-col gap-4 relative overflow-hidden"
    >
      <div className={cn("absolute top-0 left-0 right-0 h-1 opacity-80", color)} />
      
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm", color)}>
          <FolderKanban size={18} strokeWidth={2.5} />
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onPin}
            className={cn("p-1.5 rounded-lg transition-colors hover:bg-slate-100", isPinned ? "text-amber-400" : "text-slate-300 opacity-0 group-hover:opacity-100")}
          >
            <Star size={16} className={isPinned ? "fill-amber-400" : ""} />
          </button>
          <QuickMenu onSelect={onSelect} onDelete={onDelete} onPin={onPin} isPinned={isPinned} />
        </div>
      </div>
      
      <div>
        <h3 className="font-display font-bold text-lg text-slate-900 truncate group-hover:text-violet-600 transition-colors">{project.name}</h3>
        <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
          <Clock size={12} /> Updated {project.updatedAt.toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
        <StatusBadge status={project.status} />
        <div className="flex -space-x-2">
          {Array.from({ length: Math.min(3, project.collaborators) }).map((_, i) => (
            <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-500 shadow-sm">
              U{i+1}
            </div>
          ))}
          {project.collaborators > 3 && (
            <div className="w-6 h-6 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-400 shadow-sm">
              +{project.collaborators - 3}
            </div>
          )}
        </div>
      </div>
      
      {/* Tiny progress bar */}
      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
        <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${project.progress}%` }} />
      </div>
    </div>
  );
}

function ProjectRow({ project, onSelect, onPin, onDelete, isPinned }: any) {
  const themeColors = ['bg-violet-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-rose-500', 'bg-fuchsia-500'];
  const hash = project.id.charCodeAt(0);
  const color = themeColors[hash % themeColors.length];

  return (
    <div 
      onClick={onSelect}
      className="bg-white border border-slate-200/60 rounded-xl p-3 pr-4 cursor-pointer hover:shadow-md hover:border-violet-200 transition-all duration-200 group flex items-center gap-4 sm:gap-6"
    >
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0", color)}>
        <FolderKanban size={18} strokeWidth={2.5} />
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-sm text-slate-900 truncate group-hover:text-violet-600 transition-colors">{project.name}</h3>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5 sm:hidden">
            Updated {project.updatedAt.toLocaleDateString()}
          </p>
        </div>
        
        <div className="hidden sm:block w-32 flex-shrink-0">
          <StatusBadge status={project.status} />
        </div>
        
        <div className="hidden md:flex items-center gap-3 w-40 flex-shrink-0">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
             <div className={cn("h-full rounded-full", color)} style={{ width: `${project.progress}%` }} />
          </div>
          <span className="text-[10px] font-bold text-slate-400 w-6">{project.progress}%</span>
        </div>
        
        <div className="hidden lg:block text-[11px] font-medium text-slate-400 w-24 flex-shrink-0">
          {project.updatedAt.toLocaleDateString()}
        </div>
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        <button 
          onClick={onPin}
          className={cn("p-2 rounded-lg transition-colors hover:bg-slate-100", isPinned ? "text-amber-400" : "text-slate-300 opacity-0 group-hover:opacity-100")}
        >
          <Star size={16} className={isPinned ? "fill-amber-400" : ""} />
        </button>
        <QuickMenu onSelect={onSelect} onDelete={onDelete} onPin={onPin} isPinned={isPinned} />
      </div>
    </div>
  );
}

// -----------------------------------------
// 3D Orbit Component
// -----------------------------------------

function ProjectCarousel({ projects, onSelect, onPin, onDelete, pinnedIds }: any) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  useEffect(() => {
    setActiveIndex(0); // reset when filtered projects change
  }, [projects.length]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;

  // Wheel and trackpad handler
  useEffect(() => {
    let isScrolling = false;
    let wheelAccumulator = 0;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (isScrolling || projects.length <= 1) return;

      wheelAccumulator += e.deltaY;
      if (Math.abs(wheelAccumulator) > 40) {
        if (wheelAccumulator > 0 && activeIndex < projects.length - 1) {
          setActiveIndex(i => i + 1);
          isScrolling = true;
          setTimeout(() => { isScrolling = false; }, 350); 
        } else if (wheelAccumulator < 0 && activeIndex > 0) {
          setActiveIndex(i => i - 1);
          isScrolling = true;
          setTimeout(() => { isScrolling = false; }, 350);
        }
        wheelAccumulator = 0;
      }
    };

    const container = document.getElementById('carousel-container');
    container?.addEventListener('wheel', handleWheel, { passive: false });
    return () => container?.removeEventListener('wheel', handleWheel);
  }, [activeIndex, projects.length]);

  // Arrow keys & Touch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' && activeIndex < projects.length - 1) setActiveIndex(i => i + 1);
      else if (e.key === 'ArrowUp' && activeIndex > 0) setActiveIndex(i => i - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, projects.length]);

  useEffect(() => {
    let touchStartY = 0;
    let isScrolling = false;
    const container = document.getElementById('carousel-container');
    const handleTouchStart = (e: TouchEvent) => touchStartY = e.touches[0].clientY;
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); 
      if (isScrolling || projects.length <= 1) return;
      const diff = touchStartY - e.touches[0].clientY;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && activeIndex < projects.length - 1) {
          setActiveIndex(i => i + 1);
          isScrolling = true;
          setTimeout(() => { isScrolling = false; }, 350);
        } else if (diff < 0 && activeIndex > 0) {
          setActiveIndex(i => i - 1);
          isScrolling = true;
          setTimeout(() => { isScrolling = false; }, 350);
        }
      }
    };
    container?.addEventListener('touchstart', handleTouchStart, { passive: false });
    container?.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      container?.removeEventListener('touchstart', handleTouchStart);
      container?.removeEventListener('touchmove', handleTouchMove);
    };
  }, [activeIndex, projects.length]);

  const accents = [
    { bg: 'bg-violet-500', wash: 'bg-violet-500/5', shadow: 'shadow-violet-500/20' },
    { bg: 'bg-cyan-500', wash: 'bg-cyan-500/5', shadow: 'shadow-cyan-500/20' },
    { bg: 'bg-emerald-500', wash: 'bg-emerald-500/5', shadow: 'shadow-emerald-500/20' },
    { bg: 'bg-rose-500', wash: 'bg-rose-500/5', shadow: 'shadow-rose-500/20' },
    { bg: 'bg-fuchsia-500', wash: 'bg-fuchsia-500/5', shadow: 'shadow-fuchsia-500/20' }
  ];

  return (
    <div id="carousel-container" className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ perspective: isMobile ? 'none' : '1400px' }}>
      
      {/* Ambient background track/glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[120px] absolute" />
      </div>

      {/* Navigation Rail */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-20 pointer-events-auto ml-0 md:ml-4">
        <div className="hidden md:flex flex-col items-center mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest rotate-180" style={{ writingMode: 'vertical-rl' }}>Project Orbit</span>
        </div>
        <button 
          onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))} disabled={activeIndex === 0}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
        >
          <ChevronRight className="-rotate-90" size={18} strokeWidth={2.5} />
        </button>
        <div className="text-xs font-display font-bold text-slate-700 tracking-widest uppercase text-center bg-white/50 backdrop-blur-sm px-2 py-1 rounded-md">
          {String(activeIndex + 1).padStart(2, '0')} <span className="text-slate-300 mx-0.5">/</span> {String(projects.length).padStart(2, '0')}
        </div>
        <div className="flex flex-col gap-2 w-1 items-center relative py-2">
          <div className="absolute top-0 bottom-0 w-px bg-slate-200/60 -z-10" />
          {projects.map((_, i) => (
            <div key={i} onClick={() => setActiveIndex(i)} className={cn("w-1.5 rounded-full transition-all duration-400 ease-out cursor-pointer hover:bg-violet-400", i === activeIndex ? "h-8 bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.6)]" : "h-1.5 bg-slate-300")} />
          ))}
        </div>
        <button 
          onClick={() => setActiveIndex(Math.min(projects.length - 1, activeIndex + 1))} disabled={activeIndex === projects.length - 1}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
        >
          <ChevronRight className="rotate-90" size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="relative w-full max-w-xl h-full flex items-center justify-center pointer-events-none z-10" style={{ transformStyle: isMobile ? 'flat' : 'preserve-3d' }}>
        {projects.map((project: any, index: number) => {
          const offset = index - activeIndex;
          const absOffset = Math.abs(offset);
          const sign = Math.sign(offset);

          const spacingY = isMobile ? 120 : isTablet ? 90 : 120;
          const translateY = offset * spacingY; 
          const translateZ = isMobile ? 0 : -absOffset * (isTablet ? 70 : 120);
          const rotateX = isMobile ? 0 : sign * -1 * Math.min(absOffset * 15, 55);
          const scale = isMobile ? Math.max(1 - absOffset * 0.1, 0.8) : 1;
          const opacity = Math.max(1 - absOffset * (isMobile ? 0.6 : 0.4), 0);
          
          if (opacity <= 0) return null;

          const isActive = offset === 0;
          const isPinned = pinnedIds.includes(project.id);
          const hash = project.id.charCodeAt(0);
          const theme = accents[hash % accents.length];

          return (
            <div
              key={project.id}
              onClick={() => { isActive ? onSelect(project.id) : setActiveIndex(index) }}
              style={{ transform: `translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) scale(${scale})`, opacity, zIndex: 100 - absOffset }}
              className={cn(
                "absolute w-[85%] max-w-[480px] bg-white rounded-[20px] border transition-all duration-[450ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] flex flex-col group",
                isActive ? cn("border-slate-200/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] cursor-pointer pointer-events-auto hover:border-violet-300", theme.shadow) : "border-slate-200/40 shadow-sm pointer-events-auto cursor-pointer",
                !isActive && !isMobile && "hover:-translate-y-1 hover:shadow-md hover:border-slate-300 hover:opacity-100"
              )}
            >
              {isActive && <div className={cn("absolute inset-0 rounded-[20px] pointer-events-none transition-colors duration-500", theme.wash)} />}
              
              <div className="p-6 sm:p-7 relative overflow-hidden flex flex-col gap-6">
                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 opacity-90 transition-colors duration-500", isActive ? theme.bg : "bg-slate-200")} />
                
                <div className="flex items-start justify-between relative z-10 pl-2">
                  <div className="flex gap-4 items-center">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-sm transition-all duration-500 relative", isActive ? theme.bg : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-500")}>
                      {isActive && <div className="absolute inset-0 bg-white/20 rounded-2xl rounded-bl-none" />}
                      <FolderKanban size={28} strokeWidth={isActive ? 2.5 : 2} className="relative z-10" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={project.status} />
                      <div className={cn("text-xs font-bold transition-all", isActive ? "text-slate-500" : "text-slate-400")}>
                        {project.collaborators} collaborators
                      </div>
                    </div>
                  </div>
                  
                  <div className={cn("flex items-center gap-1 transition-all duration-500", isActive ? "opacity-100" : "opacity-0 pointer-events-none")}>
                    <button onClick={(e) => { e.stopPropagation(); onPin(e, project.id); }} className={cn("w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-slate-100", isPinned ? "text-amber-400" : "text-slate-300")}>
                      <Star size={18} className={isPinned ? "fill-amber-400" : ""} />
                    </button>
                    <QuickMenu onSelect={() => onSelect(project.id)} onDelete={(e) => onDelete(e, project.id)} onPin={(e) => onPin(e, project.id)} isPinned={isPinned} />
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center hover:scale-105 hover:bg-violet-600 transition-all shadow-sm ml-1">
                      <ArrowRight size={18} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
                
                <div className="relative z-10 pl-2 pr-2">
                  <h3 className={cn("font-display font-bold tracking-tight truncate transition-all duration-500", isActive ? "text-3xl text-slate-900" : "text-xl text-slate-600")}>
                    {project.name}
                  </h3>
                  
                  {isActive && (
                    <div className="mt-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-1000", theme.bg)} style={{ width: `${project.progress}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-500">{project.progress}% completed</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-4">
                    <p className={cn("font-medium transition-all duration-500 flex items-center gap-1.5", isActive ? "text-sm text-slate-500" : "text-xs text-slate-400")}>
                      <Clock size={14} /> Updated {project.updatedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
