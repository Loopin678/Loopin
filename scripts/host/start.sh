#!/usr/bin/env bash
# Hosts Loopin (website + API + live updates) from this laptop through a
# Cloudflare quick tunnel. Runs in the foreground; Ctrl+C stops everything.
# See docs/HOSTING.md.
#
#   scripts/host/start.sh            # build, start, publish the address
#   LOOPIN_SKIP_BUILD=1 scripts/host/start.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE="${XDG_STATE_HOME:-$HOME/.local/state}/loopin-host"
PORT="${LOOPIN_PORT:-3000}"
mkdir -p "$STATE"
chmod 700 "$STATE"

say() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

command -v cloudflared >/dev/null || die "cloudflared is not installed (see docs/HOSTING.md)"
command -v node >/dev/null || die "node is not installed"
[ -f "$ROOT/backend/.env" ] || die "backend/.env with DATABASE_URL is missing"
if curl -s -o /dev/null "http://localhost:$PORT/api/health" 2>/dev/null; then
    die "something is already running on port $PORT (a dev backend?). Stop it or set LOOPIN_PORT."
fi

# The public server gets its own signing secret, created once, readable only by you
if [ ! -s "$STATE/jwt_secret" ]; then
    (umask 077 && head -c 48 /dev/urandom | base64 | tr -d '\n=+/' > "$STATE/jwt_secret")
fi
JWT_SECRET="$(cat "$STATE/jwt_secret")"

if [ -z "${LOOPIN_SKIP_BUILD:-}" ]; then
    say "Building the website"
    (cd "$ROOT/frontend" && npm ci --no-audit --no-fund --loglevel=error && npm run build --silent)
    say "Building the backend"
    (cd "$ROOT/backend" && npm ci --no-audit --no-fund --loglevel=error && npm run build --silent)
fi

pids=()
cleanup() {
    trap - EXIT INT TERM
    say "Stopping"
    "$ROOT/scripts/host/publish-url.sh" --offline >/dev/null 2>&1 || true
    for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
    wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

say "Starting the Cloudflare quick tunnel"
: > "$STATE/tunnel.log"
cloudflared tunnel --no-autoupdate --url "http://localhost:$PORT" >"$STATE/tunnel.log" 2>&1 &
pids+=($!)

URL=""
for _ in $(seq 1 60); do
    URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$STATE/tunnel.log" | head -1 || true)"
    [ -n "$URL" ] && break
    sleep 1
done
[ -n "$URL" ] || die "the tunnel didn't report an address; see $STATE/tunnel.log"

say "Starting the backend for $URL"
(
    cd "$ROOT/backend"
    # dotenv keeps these (it never overrides), and takes DATABASE_URL from .env
    NODE_ENV=production PORT="$PORT" JWT_SECRET="$JWT_SECRET" \
    FRONTEND_URL="$URL" PUBLIC_URL="$URL" SERVE_FRONTEND="$ROOT/frontend/dist" \
        exec node dist/index.js
) >"$STATE/backend.log" 2>&1 &
pids+=($!)

for _ in $(seq 1 60); do
    curl -s -o /dev/null "http://localhost:$PORT/api/health" && break
    sleep 1
done
curl -s -o /dev/null "http://localhost:$PORT/api/health" || die "the backend didn't start; see $STATE/backend.log"

# The new hostname can take a few seconds to resolve publicly
for _ in $(seq 1 30); do
    curl -s -o /dev/null "$URL/api/health" && break
    sleep 2
done

say "Publishing the address for the desktop app"
"$ROOT/scripts/host/publish-url.sh" "$URL" || echo "warning: couldn't publish the address (git push failed); the desktop app's Automatic mode won't find it"
printf '%s\n' "$URL" > "$STATE/current-url"

cat <<MSG

  Loopin is live at:  $URL

  Share that link for the website. The desktop app finds it automatically.
  Logs: $STATE/backend.log, $STATE/tunnel.log
  Press Ctrl+C to stop.

MSG

# If either process dies, stop the other (systemd then restarts the service)
wait -n "${pids[@]}"
die "a hosting process exited; see the logs in $STATE"
