import React, { useState } from 'react';
import type { ProjectInvite, Project } from '../types';
import { api } from '../api/client';
import { 
  Mail, 
  X, 
  Check, 
  FolderGit2, 
  User as UserIcon, 
  Loader2
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './reui/badge';

interface InvitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  invites: ProjectInvite[];
  onInviteHandled: (acceptedProject?: Project) => void;
}

export const InvitesModal: React.FC<InvitesModalProps> = ({
  isOpen,
  onClose,
  invites,
  onInviteHandled,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAccept = async (invite: ProjectInvite) => {
    setProcessingId(invite.id);
    setErrorMsg(null);
    try {
      const res = await api.acceptInvite(invite.id);
      onInviteHandled(res.project);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to accept invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setProcessingId(inviteId);
    setErrorMsg(null);
    try {
      await api.declineInvite(inviteId);
      onInviteHandled();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to decline invitation');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Mail className="size-4.5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Project Invitations</h3>
              <p className="text-[11px] text-muted-foreground">Pending invitations for your account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {errorMsg && (
          <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive">
            {errorMsg}
          </div>
        )}

        {/* List of invites */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {invites.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No pending invitations right now.
            </div>
          ) : (
            invites.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 border border-border rounded-xl bg-secondary/30 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                      <FolderGit2 className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        {inv.project?.name || 'Project'}
                      </h4>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <UserIcon className="size-3" />
                        <span>Invited by {inv.invitedBy?.name || inv.invitedBy?.email || 'Project Lead'}</span>
                      </p>
                    </div>
                  </div>

                  <Badge variant="primary-light" className="text-[10px] capitalize shrink-0">
                    {inv.stack}
                  </Badge>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={processingId === inv.id}
                    onClick={() => handleDecline(inv.id)}
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    disabled={processingId === inv.id}
                    onClick={() => handleAccept(inv)}
                    className="h-7 text-xs gap-1"
                  >
                    {processingId === inv.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Check className="size-3" />
                    )}
                    <span>Accept Invite</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-card flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
