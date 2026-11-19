import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient, Commit } from '../api/client';

// "Connected" means: the backend has received at least one commit from this user's
// desktop app for this project. The desktop app reports every commit to
// POST /api/commits with { projectId, authorId }, so the existing
// GET /api/projects/:projectId/commits is enough to tell; no new route needed.
// A user who filled in the desktop Settings but has not committed yet still counts
// as "not connected" until that first commit arrives (the modal says so).

export type DesktopConnectionState = 'loading' | 'connected' | 'not_connected' | 'unknown';

export interface DesktopConnection {
  state: DesktopConnectionState;
  lastCommitAt: string | null;
  commitCount: number;
  refresh: () => void;
}

export function useDesktopConnection(
  projectId: string | undefined,
  userId: string | undefined,
  // Check again every few ms while not connected (used while the setup modal is open)
  pollMs?: number
): DesktopConnection {
  const [state, setState] = useState<DesktopConnectionState>('loading');
  const [lastCommitAt, setLastCommitAt] = useState<string | null>(null);
  const [commitCount, setCommitCount] = useState(0);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    if (!projectId || !userId) return;
    try {
      const { data } = await apiClient.get<Commit[] | { commits: Commit[] }>(`/projects/${projectId}/commits`);
      const commits = Array.isArray(data) ? data : data.commits ?? [];
      const mine = commits.filter(c => c.authorId === userId);
      if (!alive.current) return;
      setCommitCount(mine.length);
      // The server sorts newest first, but don't rely on it
      const latest = mine.reduce<string | null>(
        (acc, c) => (!acc || new Date(c.createdAt) > new Date(acc) ? c.createdAt : acc),
        null
      );
      setLastCommitAt(latest);
      setState(mine.length > 0 ? 'connected' : 'not_connected');
    } catch {
      // Network/server trouble: don't claim either way, and don't auto-open the modal
      if (alive.current) setState(prev => (prev === 'connected' ? prev : 'unknown'));
    }
  }, [projectId, userId]);

  useEffect(() => {
    alive.current = true;
    setState('loading');
    refresh();
    return () => { alive.current = false; };
  }, [refresh]);

  useEffect(() => {
    if (!pollMs || state === 'connected') return;
    const id = window.setInterval(refresh, pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, state, refresh]);

  return { state, lastCommitAt, commitCount, refresh };
}

// ── "Don't open the setup modal by itself again" (per user, per project) ──────
// Kept in this browser only: it is a convenience, the Board button always remains.

const dismissKey = (userId: string, projectId: string) => `loopin:desktop-setup-dismissed:${userId}:${projectId}`;

export function wasDesktopSetupDismissed(userId: string, projectId: string): boolean {
  try {
    return localStorage.getItem(dismissKey(userId, projectId)) === '1';
  } catch {
    return false;
  }
}

export function markDesktopSetupDismissed(userId: string, projectId: string): void {
  try {
    localStorage.setItem(dismissKey(userId, projectId), '1');
  } catch {
    /* storage blocked: the modal may simply show again next time */
  }
}
