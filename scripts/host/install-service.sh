#!/usr/bin/env bash
# Runs scripts/host/start.sh as a systemd user service, so Loopin is hosted
# whenever this laptop is on, even when you're logged out.
#
#   scripts/host/install-service.sh            # install and start
#   scripts/host/install-service.sh --remove   # stop and uninstall
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UNIT="$HOME/.config/systemd/user/loopin-host.service"

if [ "${1:-}" = "--remove" ]; then
    systemctl --user disable --now loopin-host.service 2>/dev/null || true
    rm -f "$UNIT"
    systemctl --user daemon-reload
    echo "Removed loopin-host.service"
    exit 0
fi

mkdir -p "$(dirname "$UNIT")"
cat > "$UNIT" <<UNIT
[Unit]
Description=Loopin hosted from this laptop (Cloudflare quick tunnel)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT
Environment=PATH=$(dirname "$(command -v node)"):/usr/local/bin:/usr/bin:/bin
ExecStart=$ROOT/scripts/host/start.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
UNIT

systemctl --user daemon-reload
systemctl --user enable --now loopin-host.service
# Keep user services running after logout
loginctl enable-linger "$USER" || echo "note: run 'sudo loginctl enable-linger $USER' to keep hosting after you log out"
echo "Installed. Status: systemctl --user status loopin-host   Logs: journalctl --user -u loopin-host -f"
