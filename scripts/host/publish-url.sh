#!/usr/bin/env bash
# Announces the current backend address to the desktop app's "Automatic" mode.
#
#   scripts/host/publish-url.sh https://example.trycloudflare.com
#   scripts/host/publish-url.sh --offline
#
# Writes {"url": ...} as backend.json on the repo's hosting-info branch, which
# the app reads from raw.githubusercontent.com. The branch always holds exactly
# one commit (force-pushed), and nothing in your working tree is touched.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

if [ "${1:-}" = "--offline" ]; then
    json='{"url": null, "updatedAt": "'"$(date -u +%FT%TZ)"'"}'
    message="Loopin backend offline"
elif [[ "${1:-}" == https://* ]]; then
    json='{"url": "'"$1"'", "updatedAt": "'"$(date -u +%FT%TZ)"'"}'
    message="Loopin backend at $1"
else
    echo "usage: $0 https://<address> | --offline" >&2
    exit 2
fi

blob=$(printf '%s\n' "$json" | git hash-object -w --stdin)
tree=$(printf '100644 blob %s\tbackend.json\n' "$blob" | git mktree)
commit=$(git -c user.name="${GIT_AUTHOR_NAME:-$(git config user.name || echo Loopin)}" \
             -c user.email="${GIT_AUTHOR_EMAIL:-$(git config user.email || echo loopin@localhost)}" \
             commit-tree "$tree" -m "$message")
git push --quiet --force origin "$commit:refs/heads/hosting-info"
echo "Published: $json"
