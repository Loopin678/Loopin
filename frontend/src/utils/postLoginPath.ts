export const HOME_PATH = '/home';

// Where to go after signing in: the page the user was trying to open, else Home.
// Only same-site paths are accepted, so this can never bounce someone to another website.
export function getPostLoginPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
    return from;
  }
  return HOME_PATH;
}