// Where the "Download desktop app" buttons point.
// GitHub's /releases/latest/download/<file> always redirects to the newest release's
// installer, so the site never needs updating when a new desktop version ships.
// VITE_DESKTOP_DOWNLOAD_URL can override it (e.g. a mirror or a pinned version).
export const DESKTOP_DOWNLOAD_URL: string =
  import.meta.env.VITE_DESKTOP_DOWNLOAD_URL ||
  'https://github.com/Loopin678/Loopin/releases/latest/download/LoopinSetup.exe';
