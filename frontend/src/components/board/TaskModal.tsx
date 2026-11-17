import React, { useEffect, useState } from 'react';
import { tasksApi, membersApi, TaskDetail, ProjectMember } from '../../api/client';
import { useBoardStore } from '../../store/boardStore';
import { X, Loader2, Trash2, Calendar, Tag, User, Code2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';

interface TaskModalProps {
  taskId: string;
  projectId: string;
  onClose: () => void;
}

export function TaskModal({ taskId, projectId, onClose }: TaskModalProps) {
  const navigate = useNavigate();
  const { updateTask, removeTask, onlineUserIds } = useBoardStore();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stack, setStack] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  useEffect(() => {
    if (!taskId || !projectId) return;
    setLoading(true);
    setError('');

    Promise.all([
      // GET /api/tasks/:taskId → 200 { task }
      tasksApi.get(taskId),
      // GET /api/project/member/:projectId → 200 { members }
      membersApi.list(projectId).catch(() => [] as ProjectMember[]),
    ])
      .then(([taskData, membersData]) => {
        setTask(taskData);
        setMembers(membersData);
        setTitle(taskData.title);
        setDescription(taskData.description ?? '');
        setStack(taskData.stack ?? '');
        setAssigneeId(taskData.assigneeId ?? '');
      })
      .catch(err => {
        setError(err.message || 'Task not found');
      })
      .finally(() => setLoading(false));
  }, [taskId, projectId]);

  const handleSave = async () => {
    if (!task) return;
    setSaving(true);
    setError('');
    try {
      // PATCH /api/tasks/:taskId { title?, description?, stack?, assigneeId? }
      const updated = await tasksApi.update(task.id, {
        title: title.trim() || task.title,
        description: description || null,
        stack: stack || null,
        assigneeId: assigneeId || null,
      });
      updateTask(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!confirm('Delete this task? This cannot be undone.')) return;
    setDeleting(true);
    try {
      // DELETE /api/tasks/:taskId → 200 { deleted: { id, listId, projectId } }
      const deleted = await tasksApi.delete(task.id);
      removeTask(deleted.id, deleted.listId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
      setDeleting(false);
    }
  };

  const handleFocusMode = () => {
    onClose();
    navigate(`/projects/${projectId}/focus/${taskId}`);
  };

  // Backdrop click → close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#151713] border border-[rgba(255,255,255,0.10)] rounded-[24px] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="animate-spin text-[#D0E36A]" size={32} />
          </div>
        )}

        {/* Error state */}
        {!loading && error && !task && (
          <div className="p-8 text-center">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#1B1E19] text-[#F4F5EF] rounded-lg text-sm border border-[rgba(255,255,255,0.08)]"
            >
              Close
            </button>
          </div>
        )}

        {/* Task content */}
        {!loading && task && (
          <>
            {/* Header */}
            <div className="flex items-start gap-3 p-5 pb-4 border-b border-[rgba(255,255,255,0.06)] shrink-0">
              <div className="flex-1 min-w-0">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-transparent text-lg font-bold text-[#F4F5EF] border border-transparent hover:border-[rgba(255,255,255,0.08)] focus:border-[#D0E36A] rounded-lg px-2 py-1 focus:outline-none transition-colors"
                  placeholder="Task title"
                />
              </div>
              <button
                onClick={onClose}
                className="p-2 text-[#6E7268] hover:text-[#F4F5EF] hover:bg-[#1B1E19] rounded-lg transition-all shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
              {error && (
                <div className="p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
                  {error}
                </div>
              )}

              {/* Assignee + Stack */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-[#6E7268] uppercase tracking-wider mb-1.5">
                    <span className="flex items-center gap-1.5"><User size={12} /> Assignee</span>
                    {assigneeId && (
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-mono normal-case",
                        onlineUserIds.has(assigneeId) ? "text-[#D0E36A]" : "text-[#6E7268]"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", onlineUserIds.has(assigneeId) ? "bg-[#D0E36A] animate-pulse" : "bg-[#6E7268]")} />
                        {onlineUserIds.has(assigneeId) ? "Online" : "Offline"}
                      </span>
                    )}
                  </label>
                  <select
                    value={assigneeId}
                    onChange={e => setAssigneeId(e.target.value)}
                    className="w-full bg-[#1B1E19] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#F4F5EF] focus:outline-none focus:border-[#D0E36A] transition-colors"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => {
                      const isOnline = onlineUserIds.has(m.userId) || (m.user?.id ? onlineUserIds.has(m.user.id) : false);
                      return (
                        <option key={m.userId} value={m.userId}>
                          {isOnline ? '● ' : '○ '}
                          {m.user?.name || m.userId} {m.stack ? `(${m.stack})` : ''} {isOnline ? '— Online' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#6E7268] uppercase tracking-wider mb-1.5">
                    <Tag size={12} /> Stack / Area
                  </label>
                  <input
                    value={stack}
                    onChange={e => setStack(e.target.value)}
                    className="w-full bg-[#1B1E19] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#F4F5EF] focus:outline-none focus:border-[#D0E36A] transition-colors placeholder:text-[#6E7268]"
                    placeholder="e.g. Frontend, Backend..."
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#6E7268] uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  className="w-full bg-[#1B1E19] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 text-sm text-[#F4F5EF] focus:outline-none focus:border-[#D0E36A] transition-colors placeholder:text-[#6E7268] resize-y custom-scrollbar"
                  placeholder="Add details, context, or acceptance criteria..."
                />
              </div>

              {/* Metadata */}
              <div className="bg-[#1B1E19] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 space-y-2.5 font-mono text-xs text-[#6E7268]">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><Calendar size={11} /> Created</span>
                  <span className="text-[#A1A69B]">{new Date(task.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-[rgba(255,255,255,0.05)] pt-2.5">
                  <span className="flex items-center gap-1.5"><Calendar size={11} /> Updated</span>
                  <span className="text-[#A1A69B]">{new Date(task.updatedAt).toLocaleString()}</span>
                </div>
                {task.commitId && (
                  <div className="flex justify-between border-t border-[rgba(255,255,255,0.05)] pt-2.5">
                    <span className="flex items-center gap-1.5"><Code2 size={11} /> Commit</span>
                    <span className="text-[#D0E36A]">{task.commitId.slice(0, 8)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[rgba(255,255,255,0.05)] pt-2.5">
                  <span>Task ID</span>
                  <span className="text-[#6E7268]">{task.id.slice(0, 8)}...</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 p-4 border-t border-[rgba(255,255,255,0.06)] bg-[#0B0C0A] rounded-b-2xl shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-all disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Delete
                </button>

                <button
                  onClick={handleFocusMode}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#D0E36A] border border-[#D0E36A]/30 bg-[#D0E36A]/08 hover:bg-[#D0E36A]/15 rounded-full transition-all"
                >
                  <ExternalLink size={13} /> Focus Mode
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 text-sm text-[#A1A69B] hover:text-[#F4F5EF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-1.5 bg-[#D0E36A] text-black text-sm font-bold rounded-full hover:bg-[#BED158] disabled:opacity-50 transition-colors"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
