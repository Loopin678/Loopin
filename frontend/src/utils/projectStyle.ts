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
