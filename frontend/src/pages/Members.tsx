import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  membersApi,
  ProjectMember,
  OutgoingInvitation,
  ApiError,
} from '../api/client';
import { useBoardStore } from '../store/boardStore';
import { connectSocket } from '../api/socket';
import {
  Loader2,
  UserPlus,
  Trash2,
  Users,
  X,
  Crown,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ArrowLeftRight,
  LogOut,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Avatar } from '../components/common/Avatar';
import { ProfileCard } from '../components/common/ProfileCard';

// ─── Sub-types ────────────────────────────────────────────────────────────────

type Tab = 'active' | 'pending';

// ─── Invite Modal ─────────────────────────────────────────────────────────────

interface InviteModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function InviteModal({ projectId, onClose, onSuccess }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [stack, setStack] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedStack = stack.trim();
    if (!trimmedEmail || !trimmedStack) return;

    setSubmitting(true);
    setError('');
    try {
      await membersApi.invite(projectId, { email: trimmedEmail, stack: trimmedStack });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Failed to send invitation. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#111418] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl p-6 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-[#5EE6B0]" />
            <h2 className="text-base font-bold text-[#ECEAE4]">Invite Member</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#5B616A] hover:text-[#ECEAE4] hover:bg-[#1C2127] rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <CheckCircle2 size={40} className="text-[#5EE6B0]" />
            <p className="text-sm font-semibold text-[#ECEAE4]">Invitation sent!</p>
            <p className="text-xs text-[#8A9099]">The user will appear in pending invitations.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
                <XCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#5B616A] uppercase tracking-wider mb-1.5">
                Email Address <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B616A] pointer-events-none" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:border-[#5EE6B0] text-sm text-[#ECEAE4] transition-colors placeholder:text-[#5B616A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5B616A] uppercase tracking-wider mb-1.5">
                Stack / Role <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={stack}
                onChange={(e) => setStack(e.target.value)}
                placeholder="e.g. Frontend, Backend, Design…"
                className="w-full px-3 py-2.5 bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-lg focus:outline-none focus:border-[#5EE6B0] text-sm text-[#ECEAE4] transition-colors placeholder:text-[#5B616A]"
              />
            </div>

            <p className="text-xs text-[#5B616A]">
              The invitation will be sent as a pending request. The user must accept it to join.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-sm text-[#8A9099] hover:text-[#ECEAE4] hover:border-[rgba(255,255,255,0.15)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !email.trim() || !stack.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5EE6B0] text-black text-sm font-bold rounded-lg hover:bg-[#4CD59F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {submitting ? 'Sending…' : 'Send Invitation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Transfer Ownership Modal ─────────────────────────────────────────────────

interface TransferModalProps {
  projectId: string;
  members: ProjectMember[];
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function TransferOwnershipModal({ projectId, members, currentUserId, onClose, onSuccess }: TransferModalProps) {
  const eligibleMembers = members.filter(
    (m) => m.userId !== currentUserId && m.status === 'ACTIVE' && m.role === 'MEMBER'
  );
  const [selectedUserId, setSelectedUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleTransfer = async () => {
    if (!selectedUserId) return;
    setSubmitting(true);
    setError('');
    try {
      await membersApi.transferOwnership(projectId, selectedUserId);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Transfer failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[#111418] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl p-6 z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-[#F59E0B]" />
            <h2 className="text-base font-bold text-[#ECEAE4]">Transfer Ownership</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#5B616A] hover:text-[#ECEAE4] hover:bg-[#1C2127] rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
            <XCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-xs text-[#8A9099] mb-4">
          Select a member to transfer project ownership to. You will become a regular member.
        </p>

        {eligibleMembers.length === 0 ? (
          <p className="text-sm text-[#5B616A] text-center py-4">No eligible members to transfer ownership to.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar mb-5">
            {eligibleMembers.map((m) => (
              <label
                key={m.userId}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selectedUserId === m.userId
                    ? 'border-[#F59E0B]/60 bg-[#F59E0B]/10'
                    : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] bg-[#161A1F]'
                )}
              >
                <input
                  type="radio"
                  name="transfer-target"
                  value={m.userId}
                  checked={selectedUserId === m.userId}
                  onChange={() => setSelectedUserId(m.userId)}
                  className="accent-[#F59E0B]"
                />
                <Avatar userId={m.userId} name={m.user?.name ?? '?'} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#ECEAE4] truncate">{m.user?.name ?? 'Unknown user'}</p>
                  <p className="text-xs text-[#5B616A]">{m.stack}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-sm text-[#8A9099] hover:text-[#ECEAE4] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleTransfer}
            disabled={!selectedUserId || submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F59E0B] text-black text-sm font-bold rounded-lg hover:bg-[#D97706] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeftRight size={14} />}
            {submitting ? 'Transferring…' : 'Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Members Page ────────────────────────────────────────────────────────

export function Members() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [outgoingInvitations, setOutgoingInvitations] = useState<OutgoingInvitation[]>([]);
  const [myMembership, setMyMembership] = useState<ProjectMember | null>(null);

  const [loading, setLoading] = useState(true);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  // Presence state
  const {
    onlineUserIds,
    setPresenceSnapshot,
    setUserOnline,
    setUserOffline,
    clearPresence,
  } = useBoardStore();

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadMembers = useCallback(async (silent = false) => {
    if (!projectId) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await membersApi.list(projectId);
      setMembers(data);
      // Determine current user's membership & role
      if (user) {
        const mine = data.find((m) => m.userId === user.id) ?? null;
        setMyMembership(mine);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  // Outgoing invitations: fetch pending invitations sent for THIS project
  // using GET /api/project/member/:projectId/invites (User A / Owner perspective)
  const loadOutgoingInvitations = useCallback(async (silent = false) => {
    if (!projectId) return;
    if (!silent) setInvitesLoading(true);
    try {
      const data = await membersApi.getOutgoingInvitations(projectId);
      setOutgoingInvitations(data);
    } catch {
      // Non-owners will receive 403, or 404/500 on network error
      setOutgoingInvitations([]);
    } finally {
      setInvitesLoading(false);
    }
  }, [projectId]);

  // ── Socket (presence) ─────────────────────────────────────────────────────

  useEffect(() => {
  if (!projectId) return;

  const socket = connectSocket();

  const join = () => socket.emit('join-project', projectId);

  const handleSnapshot = (data: { onlineUserIds: string[] }) => {
    setPresenceSnapshot(data?.onlineUserIds ?? []);
  };
  const handleOnline = (data: { userId: string }) => {
    if (data?.userId) setUserOnline(data.userId);
  };
  const handleOffline = (data: { userId: string }) => {
    if (data?.userId) setUserOffline(data.userId);
  };

  socket.on('connect', join);
  socket.on('presence:snapshot', handleSnapshot);
  socket.on('presence:online', handleOnline);
  socket.on('presence:offline', handleOffline);

  if (socket.connected) join();

  return () => {
    socket.off('connect', join);
    socket.off('presence:snapshot', handleSnapshot);
    socket.off('presence:online', handleOnline);
    socket.off('presence:offline', handleOffline);
    clearPresence();
  };
}, [projectId]);

  // ── Socket (live member + invite changes) ─────────────────────────────────

  useEffect(() => {
    if (!projectId) return;

    const socket = connectSocket();

    // Every one of these means "members or invites changed", so refetch quietly.
    // (Refetching is simpler and safer than patching state by hand.)
    const refresh = (data?: { projectId?: string }) => {
      if (data?.projectId && data.projectId !== projectId) return;
      loadMembers(true);
      loadOutgoingInvitations(true);
    };

    const events = [
      'invite:created',
      'invite:revoked',
      'invite:declined',
      'member:joined',
      'member:removed',
      'ownership:transferred',
    ];

    // A member changed their name or username: patch that row, no refetch needed
    const handleProfileUpdated = (data: { userId?: string; name?: string; username?: string | null }) => {
      if (!data?.userId || !data.name) return;
      const userId = data.userId;
      const name = data.name;
      const username = data.username ?? null;

      setMembers((prev) =>
        prev.map((m) =>
          m.userId === userId && m.user ? { ...m, user: { ...m.user, name, username } } : m
        )
      );
    };

    events.forEach((e) => socket.on(e, refresh));
    socket.on('profile:updated', handleProfileUpdated);
    return () => {
      events.forEach((e) => socket.off(e, refresh));
      socket.off('profile:updated', handleProfileUpdated);
    };
  }, [projectId, loadMembers, loadOutgoingInvitations]);

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    loadMembers();
    loadOutgoingInvitations();
  }, [loadMembers, loadOutgoingInvitations]);

  // ── Member actions ────────────────────────────────────────────────────────

  const handleRemove = async (targetUserId: string, isSelf: boolean) => {
    if (!projectId) return;
    const confirmMsg = isSelf
      ? 'Are you sure you want to leave this project?'
      : 'Remove this member from the project?';
    if (!confirm(confirmMsg)) return;

    setRemovingId(targetUserId);
    setActionError('');
    try {
      await membersApi.remove(projectId, targetUserId);
      await loadMembers();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Action failed. Please try again.';
      setActionError(msg);
      setTimeout(() => setActionError(''), 5000);
    } finally {
      setRemovingId(null);
    }
  };

  // Revoke an outgoing pending invitation (owner action)
  const handleRevokeInvitation = async (inv: OutgoingInvitation) => {
    if (!projectId) return;
    if (!confirm(`Cancel invitation sent to ${inv.user.email}?`)) return;

    setInviteActionId(inv.id);
    setActionError('');
    try {
      await membersApi.remove(projectId, inv.userId);
      await loadOutgoingInvitations();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to revoke invitation.';
      setActionError(msg);
      setTimeout(() => setActionError(''), 5000);
    } finally {
      setInviteActionId(null);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const isOwner = myMembership?.role === 'OWNER';
  const isMember = !!myMembership && myMembership.status === 'ACTIVE';

  const onlineCount = members.filter((m) => onlineUserIds.has(m.userId)).length;

  const sortedMembers = [...members].sort((a, b) => {
    // Owner first
    if (a.role === 'OWNER' && b.role !== 'OWNER') return -1;
    if (b.role === 'OWNER' && a.role !== 'OWNER') return 1;
    // Then online
    const aOnline = onlineUserIds.has(a.userId);
    const bOnline = onlineUserIds.has(b.userId);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return 0;
  });

  // ── Render helpers ────────────────────────────────────────────────────────

  const RoleBadge = ({ role }: { role: 'OWNER' | 'MEMBER' }) => (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border',
        role === 'OWNER'
          ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30'
          : 'text-[#8A9099] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]'
      )}
    >
      {role === 'OWNER' && <Crown size={9} />}
      {role === 'MEMBER' && <ShieldCheck size={9} />}
      {role}
    </span>
  );

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-[#5EE6B0]" size={32} />
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-8 max-w-3xl mx-auto">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#ECEAE4]">Members</h1>
            <p className="text-sm text-[#8A9099] mt-1.5">
              Manage who has access to this project workspace.
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#5EE6B0] text-black text-sm font-bold rounded-lg hover:bg-[#4CD59F] transition-colors shrink-0"
            >
              <UserPlus size={15} />
              Invite Member
            </button>
          )}
        </div>

        {/* ── Action error banner ──────────────────────────────────────────── */}
        {actionError && (
          <div className="mb-5 flex items-start gap-2 p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-xl">
            <XCircle size={15} className="shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

        {error && (
          <div className="mb-5 p-4 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-xl">
            {error}
            <button onClick={() => loadMembers()} className="ml-3 underline text-[#8A9099] hover:text-[#ECEAE4]">Retry</button>
          </div>
        )}

        {/* ── Summary Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users size={15} className="text-[#5EE6B0]" />
              <span className="text-xs font-semibold text-[#8A9099] uppercase tracking-wider">Active Members</span>
            </div>
            <p className="text-3xl font-bold text-[#ECEAE4]">{members.length}</p>
            <p className="text-xs text-[#5B616A] mt-1">{onlineCount} online now</p>
          </div>
          <div className="bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={15} className="text-[#F59E0B]" />
              <span className="text-xs font-semibold text-[#8A9099] uppercase tracking-wider">Pending Invites</span>
            </div>
            <p className="text-3xl font-bold text-[#ECEAE4]">{outgoingInvitations.length}</p>
            <p className="text-xs text-[#5B616A] mt-1">Awaiting acceptance</p>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-xl mb-6">
          {(['active', 'pending'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors',
                activeTab === tab
                  ? 'bg-[#1C2127] text-[#ECEAE4] shadow-sm'
                  : 'text-[#5B616A] hover:text-[#8A9099]'
              )}
            >
              {tab === 'active' ? (
                <>
                  <Users size={14} />
                  Active
                  <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-mono',
                    activeTab === 'active' ? 'bg-[#5EE6B0]/15 text-[#5EE6B0]' : 'bg-[rgba(255,255,255,0.05)] text-[#5B616A]'
                  )}>
                    {members.length}
                  </span>
                </>
              ) : (
                <>
                  <Clock size={14} />
                  Pending
                  <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-mono',
                    activeTab === 'pending' && outgoingInvitations.length > 0
                      ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                      : 'bg-[rgba(255,255,255,0.05)] text-[#5B616A]'
                  )}>
                    {outgoingInvitations.length}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────────────────────── */}

        {/* ACTIVE MEMBERS TAB */}
        {activeTab === 'active' && (
          <div className="bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[#161A1F] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-[#5B616A]" />
                <h2 className="text-xs font-bold text-[#8A9099] uppercase tracking-wider">
                  Active Members ({members.length})
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {onlineCount > 0 && (
                  <span className="flex items-center gap-1.5 text-xs font-mono text-[#5EE6B0] bg-[#5EE6B0]/10 border border-[#5EE6B0]/20 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5EE6B0] animate-pulse" />
                    {onlineCount} online
                  </span>
                )}
                {isOwner && members.length > 1 && (
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="flex items-center gap-1.5 text-xs text-[#F59E0B] hover:text-[#FBBF24] transition-colors"
                    title="Transfer ownership"
                  >
                    <ArrowLeftRight size={13} />
                    Transfer
                  </button>
                )}
              </div>
            </div>

            {sortedMembers.length === 0 ? (
              <div className="py-16 text-center">
                <Users size={32} className="text-[#5B616A] mx-auto mb-3" />
                <p className="text-sm text-[#8A9099]">No active members yet</p>
                <p className="text-xs text-[#5B616A] mt-1">Invite members to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                {sortedMembers.map((member) => {
                  const isOnline = onlineUserIds.has(member.userId);
                  const isSelf = member.userId === user?.id;
                  const isRemoving = removingId === member.userId;

                  // Determine if the remove/leave button should be shown
                  // OWNER can remove MEMBERs; MEMBER can only remove themselves
                  const canRemove =
                    isOwner && !isSelf && member.role === 'MEMBER'
                      ? true
                      : !isOwner && isSelf && isMember
                      ? true
                      : false;

                  // Owner cannot remove themselves (OWNER_CANNOT_REMOVE_SELF)
                  const showOwnerCannotLeave = isOwner && isSelf;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-[#161A1F] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar with presence dot */}
                        <div
                          className="relative shrink-0 cursor-pointer"
                          onClick={() => setProfileUserId(member.userId)}
                        >
                          <Avatar userId={member.userId} name={member.user?.name ?? '?'} size="md" />
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#111418]',
                              isOnline ? 'bg-[#5EE6B0] shadow-[0_0_8px_rgba(94,230,176,0.6)]' : 'bg-[#5B616A]'
                            )}
                            title={isOnline ? 'Online' : 'Offline'}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setProfileUserId(member.userId)}
                              className="text-sm font-semibold text-[#ECEAE4] truncate text-left hover:text-[#5EE6B0] transition-colors"
                            >
                              {member.user?.name ?? 'Unknown user'}
                              {isSelf && <span className="text-[#5B616A] ml-1 font-normal">(you)</span>}
                            </button>
                            <RoleBadge role={member.role} />
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border',
                                isOnline
                                  ? 'text-[#5EE6B0] bg-[#5EE6B0]/10 border-[#5EE6B0]/25'
                                  : 'text-[#5B616A] bg-[#161A1F] border-[rgba(255,255,255,0.05)]'
                              )}
                            >
                              <span className={cn('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-[#5EE6B0] animate-pulse' : 'bg-[#5B616A]')} />
                              {isOnline ? 'online' : 'offline'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-[#5EE6B0] bg-[rgba(94,230,176,0.10)] px-2 py-0.5 rounded-full font-medium">
                              {member.stack}
                            </span>
                            {member.user?.username && (
                              <span className="text-xs text-[#5B616A] font-mono">@{member.user.username}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {showOwnerCannotLeave && (
                          <span className="text-xs text-[#5B616A] italic hidden sm:block">
                            Transfer or delete project to leave
                          </span>
                        )}
                        {canRemove && (
                          <button
                            onClick={() => handleRemove(member.userId, isSelf)}
                            disabled={isRemoving}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                              isSelf
                                ? 'text-[#8A9099] hover:text-[#ECEAE4] hover:bg-[#1C2127]'
                                : 'text-[#5B616A] hover:text-red-400 hover:bg-red-950/30'
                            )}
                            title={isSelf ? 'Leave project' : 'Remove member'}
                          >
                            {isRemoving ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : isSelf ? (
                              <LogOut size={13} />
                            ) : (
                              <Trash2 size={13} />
                            )}
                            {isSelf ? 'Leave' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PENDING INVITATIONS TAB */}
        {activeTab === 'pending' && (
          <div className="bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[#161A1F] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-[#F59E0B]" />
                <h2 className="text-xs font-bold text-[#8A9099] uppercase tracking-wider">
                  Pending Invitations ({outgoingInvitations.length})
                </h2>
              </div>
              {invitesLoading && <Loader2 size={14} className="animate-spin text-[#5B616A]" />}
            </div>

            {outgoingInvitations.length === 0 ? (
              <div className="py-16 text-center">
                <Clock size={32} className="text-[#5B616A] mx-auto mb-3" />
                <p className="text-sm text-[#8A9099]">No pending invitations</p>
                <p className="text-xs text-[#5B616A] mt-1">
                  {isOwner
                    ? 'Invitations sent to new members will appear here until accepted.'
                    : 'No pending invitations for this project.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                {outgoingInvitations.map((inv) => {
                  const isActioning = inviteActionId === inv.id;
                  const displayEmail = inv.user?.email || inv.userId;
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-[#161A1F] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-[#1C2127] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-xs font-bold text-[#8A9099]">
                            {displayEmail.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-[#ECEAE4] truncate">
                              {displayEmail}
                            </span>
                            <RoleBadge role={inv.role} />
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30">
                              <Clock size={9} />
                              {inv.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-[#5EE6B0] bg-[rgba(94,230,176,0.10)] px-2 py-0.5 rounded-full font-medium">
                              {inv.stack}
                            </span>
                            <span className="text-xs text-[#5B616A]">
                              Awaiting acceptance
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Revoke button for owner */}
                      {isOwner && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRevokeInvitation(inv)}
                            disabled={isActioning}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#5B616A] hover:text-red-400 hover:bg-red-950/30 transition-all disabled:opacity-50"
                            title="Cancel invitation"
                          >
                            {isActioning ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                            Revoke
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showInviteModal && projectId && (
        <InviteModal
          projectId={projectId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            loadOutgoingInvitations();
          }}
        />
      )}

      {showTransferModal && projectId && user && (
        <TransferOwnershipModal
          projectId={projectId}
          members={members}
          currentUserId={user.id}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            loadMembers();
          }}
        />
      )}

      {profileUserId && (
        <ProfileCard userId={profileUserId} onClose={() => setProfileUserId(null)} />
      )}
    </div>
  );
}
