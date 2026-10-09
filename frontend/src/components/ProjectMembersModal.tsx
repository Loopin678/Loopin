import React, { useState, useEffect } from 'react';
import type { Project, ProjectMember, ProjectInvite, User } from '../types';
import { api } from '../api/client';
import { 
  Users, 
  X, 
  UserPlus, 
  Mail, 
  Trash2, 
  Check, 
  Copy, 
  ShieldCheck, 
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './reui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';

interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  currentUser: User;
  onMembersUpdated?: () => void;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  isOpen,
  onClose,
  project,
  currentUser,
  onMembersUpdated,
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStack, setInviteStack] = useState('fullstack');
  const [isSending, setIsSending] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const STACK_OPTIONS = [
    { label: 'Fullstack', value: 'fullstack' },
    { label: 'Frontend', value: 'frontend' },
    { label: 'Backend', value: 'backend' },
    { label: 'Desktop / Qt', value: 'desktop' },
    { label: 'AI / ML', value: 'ai' },
    { label: 'DevOps / Infra', value: 'devops' },
    { label: 'Design', value: 'design' },
  ];

  const fetchMembersAndInvites = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const [fetchedMembers, fetchedInvites] = await Promise.all([
        api.getProjectMembers(project.id),
        api.getProjectInvites(project.id),
      ]);
      setMembers(fetchedMembers);
      setInvites(fetchedInvites);
      onMembersUpdated?.();
    } catch (e: any) {
      console.error('Failed to load project members:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && project) {
      setMsg(null);
      setInviteEmail('');
      fetchMembersAndInvites();
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSending(true);
    setMsg(null);

    try {
      await api.sendProjectInvite(project.id, inviteEmail.trim(), inviteStack);
      setMsg({ text: `Invitation sent to ${inviteEmail.trim()}`, type: 'success' });
      setInviteEmail('');
      await fetchMembersAndInvites();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to send invite', type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this project?`)) return;
    try {
      await api.removeProjectMember(project.id, userId);
      setMsg({ text: `Removed ${memberName} from project`, type: 'success' });
      await fetchMembersAndInvites();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to remove member', type: 'error' });
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await api.cancelProjectInvite(project.id, inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to cancel invite', type: 'error' });
    }
  };

  const copyInviteLink = (inviteId: string) => {
    const link = `${window.location.origin}/?invite=${inviteId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(inviteId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Users className="size-4.5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Project Members & Invites</h3>
              <p className="text-[11px] text-muted-foreground">{project.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {msg && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center gap-2 border-b ${
              msg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}
          >
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{msg.text}</span>
          </div>
        )}

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Invite Member Section */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-primary" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Invite New Teammate
              </span>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-background text-foreground text-xs rounded-lg border border-input focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <select
                  value={inviteStack}
                  onChange={(e) => setInviteStack(e.target.value)}
                  className="bg-background text-foreground text-xs rounded-lg px-2.5 py-1.5 border border-input focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {STACK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSending}
                  className="text-xs h-8 px-3 gap-1 shrink-0"
                >
                  <Sparkles className="size-3" />
                  <span>{isSending ? 'Sending...' : 'Invite'}</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Members ({members.length})
              </span>
            </div>

            {loading && members.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Loading members...</div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden">
                {members.map((m) => {
                  const isCurrent = m.userId === currentUser.id;
                  const displayName = m.user?.name || (isCurrent ? currentUser.name : 'Teammate');
                  const displayEmail = m.user?.email || (isCurrent ? currentUser.email : '');
                  const isOwner = m.role === 'OWNER';

                  return (
                    <div
                      key={m.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-8 shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                            {displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {displayName}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.2 rounded font-mono">
                                you
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground truncate block">
                            {displayEmail}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="primary-light" className="text-[10px] px-1.5 capitalize">
                          {m.stack}
                        </Badge>

                        {isOwner ? (
                          <Badge variant="outline" className="text-[10px] gap-1 px-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400">
                            <ShieldCheck className="size-2.5" />
                            Owner
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 text-muted-foreground">
                            Member
                          </Badge>
                        )}

                        {!isCurrent && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleRemoveMember(m.userId, displayName)}
                            title="Remove member"
                            className="text-muted-foreground hover:text-destructive size-7"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Invitations */}
          {invites.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="size-3.5" />
                <span>Pending Invitations ({invites.length})</span>
              </span>

              <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-7 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Mail className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-foreground truncate block">
                          {inv.email}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Invited for <strong className="capitalize">{inv.stack}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyInviteLink(inv.id)}
                        className="h-7 text-[11px] px-2 gap-1"
                      >
                        {copiedId === inv.id ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        <span>{copiedId === inv.id ? 'Copied' : 'Copy Link'}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleCancelInvite(inv.id)}
                        title="Cancel invite"
                        className="text-muted-foreground hover:text-destructive size-7"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border bg-secondary/30 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
