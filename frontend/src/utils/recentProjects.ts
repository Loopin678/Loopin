const MAX_RECENT = 8;

// Keyed per user, so two accounts on one browser keep separate histories
const keyFor = (userId: string) => `loopin:recentProjects:${userId}`;

export function getRecentProjectIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}

export function rememberProject(userId: string, projectId: string): void {
  try {
    const next = [projectId, ...getRecentProjectIds(userId).filter((id) => id !== projectId)]
      .slice(0, MAX_RECENT);
    localStorage.setItem(keyFor(userId), JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode, quota). Recents are only a nicety, so ignore it.
  }
}