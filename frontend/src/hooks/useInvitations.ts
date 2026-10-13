import { useState, useCallback } from 'react';
import { membersApi, PendingInvitation, ApiError } from '../api/client';
import { projectsApi } from '../api/client';

export interface UseInvitationsReturn {
  invitations: PendingInvitation[];
  pendingCount: number;
  loading: boolean;
  error: string;
  actioningId: string | null; // invitation id currently being accepted/declined
  refreshInvitations: () => Promise<void>;
  syncInvitations: () => Promise<void>;
  acceptInvitation: (inv: PendingInvitation) => Promise<void>;
  declineInvitation: (inv: PendingInvitation) => Promise<void>;
  // Called after accepting so callers can refresh their project list
  onAfterAccept?: () => void;
}

/**
 * useInvitations — shared hook for the notification bell and Projects dashboard.
 *
 * Fetches the current authenticated user's *incoming* pending invitations via
 * GET /api/project/member/invites. This is the "User B" (invitee) perspective.
 *
 * Do NOT use this for outgoing invitations (the owner's sent invitations). That
 * data is fetched separately via GET /api/project/member/:projectId/invites
 * from Members.tsx.
 */
export function useInvitations(onAfterAccept?: () => void): UseInvitationsReturn {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const refreshInvitations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await membersApi.getMyInvitations();
      setInvitations(data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load invitations';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Used by live socket events: refetch without the loading spinner.
  // On failure it keeps the current list; the next event or a manual refresh resyncs.
  const syncInvitations = useCallback(async () => {
    try {
      const data = await membersApi.getMyInvitations();
      setInvitations(data);
      setError('');
    } catch {
      /* keep what we have */
    }
  }, []);

  const acceptInvitation = useCallback(async (inv: PendingInvitation) => {
    setActioningId(inv.id);
    setError('');
    try {
      await membersApi.accept(inv.projectId);
      // Remove from local state immediately for instant feedback
      setInvitations(prev => prev.filter(i => i.id !== inv.id));
      // Notify caller to refresh project list so the new project appears
      onAfterAccept?.();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.status === 404
            ? 'This invitation is no longer available.'
            : err.message
          : 'Failed to accept invitation.';
      setError(msg);
      // Re-fetch to ensure state is consistent
      try {
        const data = await membersApi.getMyInvitations();
        setInvitations(data);
      } catch { /* ignore secondary fetch error */ }
    } finally {
      setActioningId(null);
    }
  }, [onAfterAccept]);

  const declineInvitation = useCallback(async (inv: PendingInvitation) => {
    setActioningId(inv.id);
    setError('');
    try {
      await membersApi.decline(inv.projectId);
      // Remove from local state immediately
      setInvitations(prev => prev.filter(i => i.id !== inv.id));
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.status === 404
            ? 'This invitation is no longer available.'
            : err.message
          : 'Failed to decline invitation.';
      setError(msg);
      try {
        const data = await membersApi.getMyInvitations();
        setInvitations(data);
      } catch { /* ignore */ }
    } finally {
      setActioningId(null);
    }
  }, []);

  return {
    invitations,
    pendingCount: invitations.length,
    loading,
    error,
    actioningId,
    refreshInvitations,
    syncInvitations,
    acceptInvitation,
    declineInvitation,
    onAfterAccept,
  };
}
