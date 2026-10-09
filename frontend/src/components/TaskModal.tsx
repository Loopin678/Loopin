import React, { useState, useEffect } from 'react';
import type { Task, ProjectMember } from '../types';
import { X, Trash2, GitCommit, CheckSquare, Calendar, Flag, UserCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './reui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';

interface TaskModalProps {
  task: Task | null;
  members?: ProjectMember[];
  onClose: () => void;
  onUpdate: (
    taskId: string,
    updates: {
      title?: string;
      description?: string;
      stack?: string;
      priority?: string;
      dueDate?: string;
      assigneeId?: string;
    }
  ) => void;
  onDelete: (taskId: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  members = [],
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
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || task.assignee?.id || '');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStack(task.stack || '');
      setPriority(task.priority === "high" || task.priority === "low" ? (task.priority as any) : "medium");
      setDueDate(task.dueDate || '');
      setAssigneeId(task.assigneeId || task.assignee?.id || '');
    }
  }, [task]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(task.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      stack: stack.trim() || undefined,
      priority,
      dueDate: dueDate.trim() || undefined,
      assigneeId: assigneeId.trim() || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
      onClose();
    }
  };

  const selectedMember = members.find((m) => m.userId === assigneeId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-4.5 text-primary" />
            <span className="font-semibold text-foreground text-sm">Task Details</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition"
          >
            <X className="size-4.5" />
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
              className="w-full bg-background text-foreground text-xs px-3 py-2 rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Flag className="size-3.5 text-primary" />
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                className="w-full bg-background text-foreground text-xs px-3 py-2 rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                Due Date
              </label>
              <input
                type="text"
                placeholder="e.g. Jan 20, 2025"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-background text-foreground text-xs px-3 py-2 rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Assignee Dropdown */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <UserCircle className="size-3.5 text-primary" />
              Assignee (Project Members)
            </label>
            <div className="flex items-center gap-2">
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="flex-1 bg-background text-foreground text-xs px-3 py-2 rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Unassigned</option>
                {members.map((m) => {
                  const name = m.user?.name || m.user?.email || 'Teammate';
                  return (
                    <option key={m.userId} value={m.userId}>
                      {name} ({m.user?.email || m.stack})
                    </option>
                  );
                })}
              </select>

              {selectedMember && (
                <div className="flex items-center gap-1.5 bg-secondary px-2.5 py-1.5 rounded-xl border border-border">
                  <Avatar className="size-5">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {(selectedMember.user?.name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-medium text-foreground max-w-[120px] truncate">
                    {selectedMember.user?.name || selectedMember.user?.email}
                  </span>
                </div>
              )}
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
              className="w-full bg-background text-foreground text-xs px-3 py-2 rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary resize-none"
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
                className="w-full bg-background text-foreground text-xs px-3 py-2 rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary"
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
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <GitCommit className="size-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block">Linked Desktop Git Commit</span>
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
              <Trash2 className="size-4" />
              <span>Delete Task</span>
            </button>

            <div className="flex items-center gap-2">
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
