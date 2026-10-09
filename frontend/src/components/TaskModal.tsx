import React, { useState } from 'react';
import type { Task } from '../types';
import { X, Trash2, GitCommit, CheckSquare, Calendar, Flag } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './reui/badge';

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
  onUpdate: (
    taskId: string,
    updates: {
      title?: string;
      description?: string;
      stack?: string;
      priority?: string;
      dueDate?: string;
    }
  ) => void;
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
  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    task.priority === "high" || task.priority === "low" ? (task.priority as any) : "medium"
  );
  const [dueDate, setDueDate] = useState(task.dueDate || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(task.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      stack: stack.trim() || undefined,
      priority,
      dueDate: dueDate.trim() || undefined,
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground text-base">Task Details</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-background text-foreground text-sm px-3 py-2 rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-primary" />
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                className="w-full bg-background text-foreground text-sm px-3 py-2 rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Due Date
              </label>
              <input
                type="text"
                placeholder="e.g. Jan 20, 2025"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-background text-foreground text-sm px-3 py-2 rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this task..."
              className="w-full bg-background text-foreground text-sm px-3 py-2 rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Tech Stack
              </label>
              <input
                type="text"
                placeholder="e.g. Frontend, Desktop, Backend"
                value={stack}
                onChange={(e) => setStack(e.target.value)}
                className="w-full bg-background text-foreground text-sm px-3 py-2 rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Current Priority Badge
              </label>
              <div className="pt-1">
                <Badge
                  variant={
                    priority === "high"
                      ? "destructive-light"
                      : priority === "medium"
                        ? "primary-light"
                        : "warning-light"
                  }
                  className="capitalize px-2 py-1 text-xs"
                >
                  {priority} Priority
                </Badge>
              </div>
            </div>
          </div>

          {/* Linked Git Commit Info */}
          {task.commitId && (
            <div className="bg-muted/40 border border-border rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <GitCommit className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-emerald-400 block">Linked Desktop Git Commit</span>
                  <span className="text-xs font-mono text-muted-foreground">SHA: {task.commitId}</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 p-2 rounded-lg hover:bg-destructive/10 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Task</span>
            </button>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-xs"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
