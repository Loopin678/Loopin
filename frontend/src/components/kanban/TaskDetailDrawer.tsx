import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ListWithTasks, Task } from '../../types';
import { tasksService } from '../../services/tasks';
import { Loader2, X, Tag, AlignLeft, CheckCircle2, User as UserIcon, List as ListIcon, Calendar, Clock, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '../../utils/cn';

interface TaskDetailDrawerProps {
  lists: ListWithTasks[];
  setLists: React.Dispatch<React.SetStateAction<ListWithTasks[]>>;
}

export function TaskDetailDrawer({ lists, setLists }: TaskDetailDrawerProps) {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields supported by backend
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stack, setStack] = useState('');
  const [listId, setListId] = useState('');

  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (taskId) {
      loadTask();
    }
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const data = await tasksService.getTask(taskId!);
      setTask(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setStack(data.stack || '');
      setListId(data.listId);
      
      // Auto-resize title textarea
      setTimeout(() => {
        if (titleRef.current) {
          titleRef.current.style.height = 'auto';
          titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
        }
      }, 0);
    } catch (error) {
      console.error(error);
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigate(`/projects/${projectId}`);
  };

  const handleSave = async () => {
    if (!task || !taskId) return;
    setIsSaving(true);
    try {
      let finalTask = task;
      if (task.listId !== listId) {
        finalTask = await tasksService.moveTask(taskId, listId, 0); 
      }
      
      const updated = await tasksService.updateTask(taskId, {
        title,
        description,
        stack,
        assigneeId: task.assigneeId,
      } as Partial<Task>);
      
      setTask(updated);

      // Instantly sync parent state
      setLists(prevLists => {
        const newLists = [...prevLists];
        const oldListIndex = newLists.findIndex(l => l.id === task.listId);
        const newListIndex = newLists.findIndex(l => l.id === listId);

        if (oldListIndex !== -1) {
          newLists[oldListIndex] = {
            ...newLists[oldListIndex],
            tasks: newLists[oldListIndex].tasks.filter(t => t.id !== taskId)
          };
        }

        if (newListIndex !== -1) {
          const updatedSummary = {
            ...updated,
            position: 0,
            assigneeId: updated.assigneeId
          };
          newLists[newListIndex] = {
            ...newLists[newListIndex],
            tasks: [updatedSummary, ...newLists[newListIndex].tasks]
          };
        }

        return newLists;
      });
      
    } catch (error) {
      console.error('Failed to update task', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end font-sans">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ x: '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.5 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-violet-600" size={32} />
            </div>
          ) : !task ? null : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                    Task #{taskId?.substring(0, 8)}
                  </span>
                  {isSaving && <span className="text-xs font-medium text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Saving...</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleSave} disabled={isSaving} className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-70">
                    Save Changes
                  </button>
                  <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  
                  <textarea
                    ref={titleRef}
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    placeholder="Task Title"
                    className="w-full text-3xl font-bold text-slate-900 placeholder:text-slate-300 bg-transparent border-none focus:outline-none focus:ring-0 resize-none leading-tight mb-8"
                    rows={1}
                  />

                  <div className="mb-8">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold mb-3">
                      <AlignLeft size={18} className="text-slate-400" /> Description
                    </div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a more detailed description..."
                      className="w-full min-h-[150px] p-4 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-violet-500 rounded-lg text-sm text-slate-700 font-medium leading-relaxed resize-y focus:outline-none focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <Tooltip.Provider delayDuration={200}>
                    <div className="mb-8 opacity-60 pointer-events-none relative">
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <div className="absolute inset-0 z-10 pointer-events-auto" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content className="px-2.5 py-1.5 bg-slate-800 text-xs font-medium text-white rounded border border-slate-700 shadow-xl" sideOffset={5}>
                            Subtasks not supported by backend
                            <Tooltip.Arrow className="fill-slate-800" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                          <CheckCircle2 size={18} className="text-slate-400" /> Subtasks <Lock size={12} className="text-slate-400 ml-1" />
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-sm text-slate-400 font-medium">
                        Subtasks are disabled
                      </div>
                    </div>
                  </Tooltip.Provider>

                </div>

                {/* Sidebar Properties Area */}
                <div className="w-80 bg-slate-50/50 border-l border-slate-200 p-6 overflow-y-auto flex flex-col gap-6">
                  
                  {/* Status Property */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <ListIcon size={14} /> Status / List
                    </label>
                    <select
                      value={listId}
                      onChange={(e) => setListId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 shadow-sm transition-all appearance-none cursor-pointer"
                    >
                      {lists.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assignee Property */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <UserIcon size={14} /> Assignee
                    </label>
                    <div className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                        {task.assigneeId ? task.assigneeId.charAt(0).toUpperCase() : '?'}
                      </div>
                      <span className="text-sm font-semibold text-slate-700 flex-1 truncate">
                        {task.assigneeId || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  {/* Stack/Tag Property */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Tag size={14} /> Tag (Stack)
                    </label>
                    <input
                      type="text"
                      value={stack}
                      onChange={(e) => setStack(e.target.value)}
                      placeholder="e.g. Frontend"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 shadow-sm transition-all placeholder:text-slate-300 placeholder:font-normal"
                    />
                  </div>

                  {/* Mock Dates (Readonly) */}
                  <div className="pt-6 mt-2 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> Created</span>
                      <span className="text-slate-700 font-semibold">{new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1.5"><Clock size={14} /> Updated</span>
                      <span className="text-slate-700 font-semibold">{new Date(task.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
