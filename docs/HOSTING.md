# Hosting Loopin from a laptop

Loopin (website, API and live updates) can run on one laptop and be reachable from the internet through a free **Cloudflare quick tunnel**. No router setup or domain is needed.

## How it works

```
browser / desktop app ──https──> random-name.trycloudflare.com ──tunnel──> this laptop :3000
                                                                            backend serves the
                                                                            website, /api and
                                                                            /socket.io
```

- The backend serves the built website itself, so everything is one address. Cookies, CORS and sockets need no cross-site setup.
- Each start gets a **new random address**. [scripts/host/start.sh](../scripts/host/start.sh) publishes it to `backend.json` on the repository's `hosting-info` branch. The desktop app's "Find the Loopin server automatically" setting reads it from there.

## One-time setup

1. Install `cloudflared` from Cloudflare's package repository:

   ```bash
   sudo dnf config-manager addrepo --from-repofile=https://pkg.cloudflare.com/cloudflared.repo
   sudo dnf install cloudflared
   ```

2. Make sure `backend/.env` has `DATABASE_URL`. The hosted server creates its own signing secret on first start, in `~/.local/state/loopin-host/jwt_secret` (readable only by you).

3. Apply the database migrations (they add the table used by "Sign in with Loopin"):

   ```bash
   cd backend
   npx prisma migrate resolve --applied 0_init   # once: mark the existing schema as the baseline
   npx prisma migrate deploy                      # creates the ClientToken table
   ```

   Don't use `prisma db push` on the team database: it drops columns that were added there by hand.

## Start and stop

```bash
scripts/host/start.sh
```

It builds the website and backend, opens the tunnel, starts the server and prints the address, then keeps running. **Ctrl+C** stops everything and marks the server offline for the desktop app. To start faster without rebuilding, run `LOOPIN_SKIP_BUILD=1 scripts/host/start.sh`.

To keep it running whenever the laptop is on, even when you're logged out:

```bash
scripts/host/install-service.sh            # install and start as a systemd user service
systemctl --user status loopin-host         # check it
journalctl --user -u loopin-host -f         # follow its log
scripts/host/install-service.sh --remove    # uninstall
```

The current address is also saved in `~/.local/state/loopin-host/current-url`. Logs go to `backend.log` and `tunnel.log` in the same folder.

## Limitations of a quick tunnel

- **The address changes on every restart.** Website users need the new link. The desktop app finds it automatically, though GitHub can take a few minutes to serve the updated `backend.json`.
- **The laptop must be on and online.** When it's off, Loopin is offline.
- **No uptime guarantee.** Cloudflare offers quick tunnels for testing and demos.
- **Google and GitHub sign-in don't work on the hosted website.** Both require a fixed callback address registered in advance. Email/password accounts work, and so does the desktop app's "Sign in to Loopin" for every account type.

A *named* Cloudflare tunnel on your own domain fixes the first and last points without code changes. It needs the domain's DNS managed by Cloudflare.

## Security notes

- The hosted server runs with `NODE_ENV=production`: secure cookies, and it refuses to start without a real `JWT_SECRET`.
- Every API route except sign-up, log-in, the health check and the device sign-in endpoints requires a signed-in user who is a member of the project involved.
- Desktop and CLI sign-ins are revocable tokens, stored only as hashes. Remove one under **Profile → Connected apps**.
- Login attempts and API requests are rate-limited per visitor.
