import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { membersApi, ProjectMember } from '../api/client';
import { Loader2, UserPlus, Trash2, Users } from 'lucide-react';

export function Members() {
  const { projectId } = useParams<{ projectId: string }>();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add member form
  const [userId, setUserId] = useState('');
  const [stack, setStack] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    if (projectId) loadMembers();
  }, [projectId]);

  const loadMembers = async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      // GET /api/project/member/:projectId → 200 { members: ProjectMember[] }
      const data = await membersApi.list(projectId);
      setMembers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !userId.trim() || !stack.trim()) return;
    setAdding(true);
    setAddError('');
    try {
      // POST /api/project/member/:projectId { userId, stack }
      // NOTE: userId must be an actual user ID (UUID), not an email address
      const member = await membersApi.add(projectId, {
        userId: userId.trim(),
        stack: stack.trim(),
      });
      setMembers(prev => [...prev, member]);
      setUserId('');
      setStack('');
    } catch (err: any) {
      setAddError(err.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!projectId) return;
    if (!confirm('Remove this member from the project?')) return;
    try {
      // DELETE /api/project/member/:projectId/:userId → 204
      await membersApi.remove(projectId, memberId);
      setMembers(prev => prev.filter(m => m.userId !== memberId));
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-[#5EE6B0]" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#ECEAE4]">Members</h1>
          <p className="text-sm text-[#8A9099] mt-1.5">
            Manage who has access to this project workspace.
          </p>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Add Member */}
        <div className="bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-bold text-[#ECEAE4] mb-4 flex items-center gap-2">
            <UserPlus size={16} className="text-[#5EE6B0]" />
            Add Member
          </h2>
          <form onSubmit={handleAdd} className="space-y-4">
            {addError && (
              <div className="p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
                {addError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#5B616A] uppercase tracking-wider mb-1.5">
                  User ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:border-[#5EE6B0] text-sm text-[#ECEAE4] transition-colors placeholder:text-[#5B616A] font-mono"
                  placeholder="paste user UUID..."
                />
                <p className="text-xs text-[#5B616A] mt-1">
                  Enter the user's UUID (found in their profile)
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5B616A] uppercase tracking-wider mb-1.5">
                  Stack / Role <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={stack}
                  onChange={e => setStack(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:border-[#5EE6B0] text-sm text-[#ECEAE4] transition-colors placeholder:text-[#5B616A]"
                  placeholder="e.g. Frontend, Backend..."
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={adding || !userId.trim() || !stack.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-[#5EE6B0] text-black text-sm font-bold rounded-lg hover:bg-[#4CD59F] disabled:opacity-50 transition-colors"
              >
                {adding ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {adding ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>

        {/* Members List */}
        <div className="bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[#161A1F] flex items-center gap-2">
            <Users size={16} className="text-[#5B616A]" />
            <h2 className="text-xs font-bold text-[#8A9099] uppercase tracking-wider">
              Active Members ({members.length})
            </h2>
          </div>

          {members.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={32} className="text-[#5B616A] mx-auto mb-3" />
              <p className="text-sm text-[#8A9099]">No members yet</p>
              <p className="text-xs text-[#5B616A] mt-1">Add members using their User ID above</p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-[#161A1F] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1C2127] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-sm font-bold text-[#8A9099] shrink-0">
                      {(member.user?.name || member.userId).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#ECEAE4]">
                        {member.user?.name || 'Unknown User'}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {member.user?.email && (
                          <span className="text-xs text-[#5B616A]">{member.user.email}</span>
                        )}
                        <span className="text-xs text-[#5EE6B0] bg-[rgba(94,230,176,0.10)] px-2 py-0.5 rounded-full font-medium">
                          {member.stack}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(member.userId)}
                    className="p-2 text-[#5B616A] hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all"
                    title="Remove member"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
