// "Test A" -> "TA", "Shivansh Arora" -> "SA"
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return '?';

  const last = parts[parts.length - 1];
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();

  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}