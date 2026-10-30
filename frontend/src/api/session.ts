// Full page load to the login screen, for a session that expired mid-use.
// Its own module so tests can observe it (jsdom can't navigate).
export function goToLogin(): void {
  window.location.href = '/login';
}
