import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Routes, Route } from 'react-router-dom';
import { projectsService } from '../services/projects';
import { listsService } from '../services/lists';
import { Project, ListWithTasks } from '../types';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { Sidebar } from '../components/layout/Sidebar';
import { ProjectHeader } from '../components/projects/ProjectHeader';
import { TaskDetailDrawer } from '../components/kanban/TaskDetailDrawer';
import { BoardFilterSort } from '../components/kanban/BoardFilterSort';
import { Search, Filter, Kanban, List as ListIcon, Loader2, ArrowUpDown } from 'lucide-react';
import { cn } from '../utils/cn';

export function ProjectDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [lists, setLists] = useState<ListWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'board' | 'list'>('board');
  
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      if (!projectId) return;
      const [projData, listsData] = await Promise.all([
        projectsService.getProject(projectId),
        listsService.getListsByProject(projectId)
      ]);
      setProject(projData);
      setLists(listsData);
    } catch (error) {
      console.error(error);
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-4">
      <Loader2 size={32} className="animate-spin text-violet-600" /> 
      <p className="text-sm font-medium">Loading workspace...</p>
    </div>
  );
  
  if (!project) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-editorial-bg font-sans selection:bg-editorial-mustard/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-editorial-bg transition-all duration-200 p-3 pl-0 relative z-10">
        <div className="flex-1 flex flex-col bg-editorial-surface rounded-xl border border-black/10 shadow-sm overflow-hidden relative">
          <ProjectHeader project={project} />
          
          {/* Editorial Toolbar */}
          <div className="px-8 py-4 bg-editorial-surface border-b border-black/10 shrink-0 flex items-center justify-between z-10">
          
          <div className="flex items-center gap-4">
            <div 
              className="relative group cursor-text"
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            >
              <Search size={18} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 group-hover:text-black/60 transition-colors" />
              <div className="pl-9 pr-3 py-2 w-64 bg-editorial-bg border border-black/10 rounded-lg text-sm text-black/60 font-semibold group-hover:border-black/20 group-focus-within:border-editorial-cobalt transition-all flex items-center justify-between cursor-pointer shadow-sm">
                <span>Search tasks...</span>
                <span className="flex items-center gap-0.5 text-[10px] font-bold bg-white border border-black/10 px-1.5 py-0.5 rounded text-black/40 uppercase tracking-wider">
                  <kbd>Cmd</kbd> <kbd>K</kbd>
                </span>
              </div>
            </div>
            
            <div className="w-px h-6 bg-black/10 mx-1" />
            
            <BoardFilterSort />
          </div>

          {/* Segmented Control */}
          <div className="flex items-center bg-black/5 border border-black/5 rounded-lg p-1 shadow-inner">
            <button 
              onClick={() => setView('board')}
              className={cn(
                "flex items-center gap-2 px-5 py-2 text-[13px] font-bold rounded-md transition-all duration-200",
                view === 'board' 
                  ? "bg-white text-editorial-cobalt shadow-sm border border-black/5" 
                  : "text-black/50 hover:text-black/80 border border-transparent"
              )}
            >
              <Kanban size={18} strokeWidth={2} /> Board
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn(
                "flex items-center gap-2 px-5 py-2 text-[13px] font-bold rounded-md transition-all duration-200",
                view === 'list' 
                  ? "bg-white text-editorial-cobalt shadow-sm border border-black/5" 
                  : "text-black/50 hover:text-black/80 border border-transparent"
              )}
            >
              <ListIcon size={18} strokeWidth={2} /> List
            </button>
          </div>
        </div>

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-hidden relative bg-editorial-surface">
          {view === 'board' ? (
            <KanbanBoard 
              projectId={project.id} 
              lists={lists} 
              setLists={setLists}
            />
          ) : (
            <div className="absolute inset-0 overflow-auto p-8">
               <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                     <tr>
                       <th className="font-semibold px-6 py-3.5">Task Title</th>
                       <th className="font-semibold px-6 py-3.5">Status</th>
                       <th className="font-semibold px-6 py-3.5">Tag</th>
                       <th className="font-semibold px-6 py-3.5">Created</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {lists.flatMap(l => l.tasks.map(t => ({...t, listName: l.name}))).map((task: any) => (
                       <tr key={task.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => navigate(`tasks/${task.id}`)}>
                         <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-violet-600 transition-colors">
                           {task.title}
                           {task.description && <span className="block mt-0.5 text-xs text-slate-500 font-normal truncate max-w-md">{task.description}</span>}
                         </td>
                         <td className="px-6 py-4">
                           <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                             {task.listName}
                           </span>
                         </td>
                         <td className="px-6 py-4">
                           {task.stack ? (
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100">
                               {task.stack}
                             </span>
                           ) : (
                             <span className="text-slate-300">-</span>
                           )}
                         </td>
                         <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                           {new Date(task.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {lists.flatMap(l => l.tasks).length === 0 && (
                   <div className="p-12 text-center flex flex-col items-center justify-center">
                     <ListIcon size={32} className="text-slate-300 mb-3" />
                     <h3 className="text-sm font-semibold text-slate-900">No tasks found</h3>
                     <p className="text-sm text-slate-500 mt-1">Get started by switching to the board view and adding a task.</p>
                   </div>
                 )}
               </div>
            </div>
          )}
          
          <Routes>
            <Route path="tasks/:taskId" element={<TaskDetailDrawer lists={lists} setLists={setLists} />} />
          </Routes>
        </main>
        </div>
      </div>
    </div>
  );
}
