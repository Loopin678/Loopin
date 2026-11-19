// Shared helpers for the Table and Insights views of a board.

// One colour per list kind, used for the progress chart and list dots in these views.
// Validated together on the dark card surface (#151713) with the dataviz palette
// checker, in this left-to-right order: lightness band, chroma, colour-blind and
// normal-vision separation, and 3:1 contrast all pass.
export const KIND_ORDER = ['TODO', 'IN_PROGRESS', 'CUSTOM', 'DONE'] as const;
export const KIND_COLORS: Record<string, string> = {
  TODO: '#3987e5',
  IN_PROGRESS: '#c98500',
  CUSTOM: '#9085e9',
  DONE: '#0ca30c',
};
export const KIND_LABELS: Record<string, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  CUSTOM: 'Other lists',
  DONE: 'Done',
};

// Priority is free text on the server (default "medium"); known values sort sensibly
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function priorityRank(p: string | null | undefined): number {
  if (!p) return 4;
  return PRIORITY_RANK[p.toLowerCase()] ?? 4;
}

export function priorityLabel(p: string | null | undefined): string {
  if (!p) return 'None';
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

// Due dates are stored as text; anything unparseable is treated as "no due date"
export function dueInfo(due: string | null | undefined): { time: number | null; label: string | null } {
  if (!due) return { time: null, label: null };
  // "2026-11-20" would be read as UTC midnight (the day before, west of UTC): read it as a local date
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due.trim());
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(due);
  if (isNaN(d.getTime())) return { time: null, label: null };
  // End of that day, so a task due today is not overdue until tomorrow
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime();
  return { time: end, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
}
