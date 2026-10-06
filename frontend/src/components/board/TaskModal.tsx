import React, { useEffect, useState } from 'react';
import { tasksApi, membersApi, TaskDetail, ProjectMember } from '../../api/client';
import { useBoardStore } from '../../store/boardStore';
import { X, Loader2, Trash2, Calendar, Tag, User, Code2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TaskModalProps {
  taskId: string;
  projectId: string;
  onClose: () => void;
}

export function TaskModal({ taskId, projectId, onClose }: TaskModalProps) {
  const navigate = useNavigate();
  const { updateTask, removeTask } = useBoardStore();

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
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#111418] border border-[rgba(255,255,255,0.10)] rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="animate-spin text-[#5EE6B0]" size={32} />
          </div>
        )}

        {/* Error state */}
        {!loading && error && !task && (
          <div className="p-8 text-center">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#161A1F] text-[#ECEAE4] rounded-lg text-sm border border-[rgba(255,255,255,0.08)]"
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
                  className="w-full bg-transparent text-lg font-bold text-[#ECEAE4] border border-transparent hover:border-[rgba(255,255,255,0.08)] focus:border-[#5EE6B0] rounded-lg px-2 py-1 focus:outline-none transition-colors"
                  placeholder="Task title"
                />
              </div>
              <button
                onClick={onClose}
                className="p-2 text-[#5B616A] hover:text-[#ECEAE4] hover:bg-[#161A1F] rounded-lg transition-all shrink-0"
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
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#5B616A] uppercase tracking-wider mb-1.5">
                    <User size={12} /> Assignee
                  </label>
                  <select
                    value={assigneeId}
                    onChange={e => setAssigneeId(e.target.value)}
                    className="w-full bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#ECEAE4] focus:outline-none focus:border-[#5EE6B0] transition-colors"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.userId} value={m.userId}>
                        {m.user?.name || m.userId} {m.stack ? `(${m.stack})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#5B616A] uppercase tracking-wider mb-1.5">
                    <Tag size={12} /> Stack / Area
                  </label>
                  <input
                    value={stack}
                    onChange={e => setStack(e.target.value)}
                    className="w-full bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#ECEAE4] focus:outline-none focus:border-[#5EE6B0] transition-colors placeholder:text-[#5B616A]"
                    placeholder="e.g. Frontend, Backend..."
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#5B616A] uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  className="w-full bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 text-sm text-[#ECEAE4] focus:outline-none focus:border-[#5EE6B0] transition-colors placeholder:text-[#5B616A] resize-y custom-scrollbar"
                  placeholder="Add details, context, or acceptance criteria..."
                />
              </div>

              {/* Metadata */}
              <div className="bg-[#161A1F] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 space-y-2.5 font-mono text-xs text-[#5B616A]">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><Calendar size={11} /> Created</span>
                  <span className="text-[#8A9099]">{new Date(task.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-[rgba(255,255,255,0.05)] pt-2.5">
                  <span className="flex items-center gap-1.5"><Calendar size={11} /> Updated</span>
                  <span className="text-[#8A9099]">{new Date(task.updatedAt).toLocaleString()}</span>
                </div>
                {task.commitId && (
                  <div className="flex justify-between border-t border-[rgba(255,255,255,0.05)] pt-2.5">
                    <span className="flex items-center gap-1.5"><Code2 size={11} /> Commit</span>
                    <span className="text-[#5EE6B0]">{task.commitId.slice(0, 8)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[rgba(255,255,255,0.05)] pt-2.5">
                  <span>Task ID</span>
                  <span className="text-[#5B616A]">{task.id.slice(0, 8)}...</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 p-4 border-t border-[rgba(255,255,255,0.06)] bg-[#0B0D10] rounded-b-2xl shrink-0">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#5EE6B0] border border-[#5EE6B0]/30 bg-[#5EE6B0]/08 hover:bg-[#5EE6B0]/15 rounded-lg transition-all"
                >
                  <ExternalLink size={13} /> Focus Mode
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 text-sm text-[#8A9099] hover:text-[#ECEAE4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-1.5 bg-[#5EE6B0] text-black text-sm font-bold rounded-lg hover:bg-[#4CD59F] disabled:opacity-50 transition-colors"
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
