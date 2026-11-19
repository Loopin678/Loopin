// Gives every project a stable cover gradient from the Loopin olive/chartreuse family,
// so the same project always looks the same across Home, Projects and the sidebar.
const COVERS = [
  'from-[#1F2A0E] via-[#4F6419] to-[#C2D85A]',
  'from-[#151A0C] via-[#3A4D14] to-[#A9C440]',
  'from-[#1C2210] via-[#5F6C26] to-[#D8D58A]',
  'from-[#12160A] via-[#46561F] to-[#A9B97A]',
  'from-[#1A1F0C] via-[#6F8A22] to-[#E2EE9C]',
  'from-[#161C0D] via-[#34431A] to-[#B9C96A]',
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function projectCover(id: string): string {
  return COVERS[hash(id) % COVERS.length];
}

// ── Custom covers ───────────────────────────────────────────────────────────
// A project's `cover` is one of:
//   "stock:<id>"     one of the illustrations in /public/covers
//   "color:#rrggbb"  a solid colour
//   "data:image/…"   an image the owner uploaded (already resized in the browser)
//   null             the default gradient above

export const STOCK_COVERS: { id: string; label: string }[] = [
  { id: 'hills', label: 'Hills' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'contours', label: 'Contours' },
  { id: 'horizon', label: 'Horizon' },
  { id: 'dunes', label: 'Dunes' },
  { id: 'loops', label: 'Loops' },
  { id: 'mesh', label: 'Mesh' },
  { id: 'peaks', label: 'Peaks' },
];

export const COVER_COLORS: { hex: string; label: string }[] = [
  { hex: '#D0E36A', label: 'Chartreuse' },
  { hex: '#A9B97A', label: 'Sage' },
  { hex: '#6F8A22', label: 'Olive' },
  { hex: '#3A4D14', label: 'Moss' },
  { hex: '#1F2A0E', label: 'Forest' },
  { hex: '#E8E4C9', label: 'Cream' },
  { hex: '#F59E0B', label: 'Amber' },
  { hex: '#C2703D', label: 'Terracotta' },
  { hex: '#C2577A', label: 'Rose' },
  { hex: '#5B5FC7', label: 'Indigo' },
  { hex: '#2F6F73', label: 'Teal' },
  { hex: '#23271F', label: 'Graphite' },
];

export type ParsedCover =
  | { kind: 'default' }
  | { kind: 'stock'; id: string; url: string }
  | { kind: 'color'; hex: string }
  | { kind: 'image'; url: string };

export function parseCover(cover: string | null | undefined): ParsedCover {
  if (!cover) return { kind: 'default' };
  if (cover.startsWith('stock:')) {
    const id = cover.slice(6);
    if (STOCK_COVERS.some(s => s.id === id)) return { kind: 'stock', id, url: `/covers/${id}.svg` };
  }
  if (/^color:#[0-9a-fA-F]{6}$/.test(cover)) return { kind: 'color', hex: cover.slice(6) };
  if (cover.startsWith('data:image/')) return { kind: 'image', url: cover };
  return { kind: 'default' };
}

// Light covers need dark text on top of them
export function isLightColor(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

// "Loopin v2" -> "LV", "campus" -> "CA"
export function projectMonogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Relative "3 days ago" style label for dates
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < day) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
