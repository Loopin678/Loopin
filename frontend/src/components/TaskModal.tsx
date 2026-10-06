import React, { useState } from 'react';
import type { Task } from '../types';
import { X, Trash2, GitCommit, CheckSquare } from 'lucide-react';

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
  onUpdate: (taskId: string, updates: { title?: string; description?: string; stack?: string }) => void;
  onDelete: (taskId: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  onClose,
  onUpdate,
  onDelete,
}) => {
  if (!task) return null;

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [stack, setStack] = useState(task.stack || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(task.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      stack: stack.trim() || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-sky-400" />
            <span className="font-bold text-white text-base">Task Details</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-800 text-slate-100 text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this task..."
              className="w-full bg-slate-800 text-slate-100 text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Tech Stack
              </label>
              <input
                type="text"
                placeholder="e.g. Frontend, Desktop, Backend"
                value={stack}
                onChange={(e) => setStack(e.target.value)}
                className="w-full bg-slate-800 text-slate-100 text-sm px-3.5 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Task ID
              </label>
              <div className="bg-slate-800/60 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-400 truncate">
                {task.id}
              </div>
            </div>
          </div>

          {/* Linked Git Commit Info */}
          {task.commitId && (
            <div className="bg-slate-800/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <GitCommit className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-emerald-400 block">Linked Desktop Git Commit</span>
                  <span className="text-xs font-mono text-slate-300">SHA: {task.commitId}</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-500/10 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Task</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-500/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
