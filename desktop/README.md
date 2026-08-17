# Collab Desktop Client (MVP)

A Qt6/QML + C++ desktop app that:
- logs in with GitHub via OAuth **Device Flow**
- opens a local git repo and shows the working-directory diff (via libgit2)
- sends that diff to your backend (or, if none is configured, groups it
  locally with a naive stand-in) to get back proposed commit groups
- lets you review and confirm those groups, then actually creates the
  git commits and pushes them via libgit2

This has been build-tested (compiles, links, and loads its QML with no
runtime errors) against Qt 6.4.2 and libgit2 1.7.2 on Ubuntu 24.04. The
git logic (diff reading, including new/untracked files, staging,
committing) was also exercised against a real throwaway repo — see
"What was actually tested" below.

## 1. Before you build

**Register a GitHub OAuth App:**
1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Any placeholder value works for "Authorization callback URL" (e.g.
   `http://localhost`) — Device Flow doesn't use it.
3. **Check "Enable Device Flow"** on the app's settings page. This is
   off by default; without it `/login/device/code` returns 404.
4. Copy the **Client ID** and paste it into
   `src/auth/GitHubAuth.cpp`, replacing `YOUR_GITHUB_OAUTH_CLIENT_ID`.
   No client secret is needed for Device Flow.

## 2. Install dependencies

**Ubuntu/Debian:**
```bash
sudo apt install qt6-base-dev qt6-declarative-dev qml6-module-qtquick \
    qml6-module-qtquick-controls qml6-module-qtquick-layouts \
    qml6-module-qtquick-window qml6-module-qtqml-workerscript \
    qml6-module-qtquick-templates libgit2-dev pkg-config cmake build-essential
```

**macOS (Homebrew):**
```bash
brew install qt libgit2 pkg-config cmake
```

**Windows:** easiest path is [vcpkg](https://vcpkg.io) for libgit2
(`vcpkg install libgit2`) plus the official Qt6 installer for the Qt
side; wire both into CMake via `CMAKE_PREFIX_PATH` /
`CMAKE_TOOLCHAIN_FILE`.

## 3. Build

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build -j$(nproc)
./build/collab_desktop_client
```

## 4. Try it out

1. Click "Login with GitHub" — a browser opens and a code is shown in
   the app. Enter the code on GitHub to approve.
2. Paste the path to a local git repo you have write access to, click
   "Open".
3. Edit some files in that repo in another terminal/editor. The app
   polls every 2s and refreshes the change list automatically (or hit
   "Refresh now").
4. Click "Organize Changes". With no `backendUrl` set on `ApiClient`
   (the default), this uses a **local mock grouping** — it buckets
   changed files by top-level directory just so you can exercise the
   rest of the flow. Swap in your real backend once it exists by
   setting `backendUrl` on the `ApiClient { }` in `qml/main.qml`.
5. Review the proposed commits, click "Confirm and Push" — this
   creates real commits in the repo you opened and pushes the current
   branch to `origin` using your GitHub token.

## What was actually tested

While building this I compiled and ran the app (offscreen, headless)
to confirm it loads with no QML errors, and separately wrote a small
standalone harness that exercised `GitRepo`/`DiffModel` directly
against a real throwaway git repo — modifying a tracked file and
adding two new untracked files, then confirming:
- the diff correctly reports all three changes (this caught a real
  bug: libgit2 excludes untracked files from a diff by default, and
  separately excludes their *content* even when included, unless you
  ask for both — both are now handled)
- new files are correctly labeled `"added"` rather than `"modified"`
- staging + committing a chosen subset of files produces a real git
  commit with exactly those files, leaving the rest pending

Pushing (`pushCurrentBranch`) and the GitHub Device Flow login were
**not** exercised end-to-end here (both need real network access to
github.com and a real OAuth app / remote, which this environment
doesn't have) — read that code carefully, and test it against a
scratch repo/remote before pointing it at anything you care about.

## Known gaps / next steps

- **Token storage**: the GitHub token currently only lives in memory
  (`window.githubToken` in `main.qml`) and is lost on restart. Add
  [QtKeychain](https://github.com/frankosterfeld/qtkeychain) to
  persist it in the OS keychain instead of asking the user to log in
  every run.
- **Deleted files**: `stageAndCommit` calls `git_index_add_bypath` for
  every file, which is wrong for deletions — use
  `git_index_remove_bypath` for entries whose `changeType` is
  `"deleted"`.
- **Change polling** is a dumb 2s timer, not real file-system events —
  fine for an MVP, but the design doc's "change-event store" concept
  is the real fix if you want instant feedback without polling.
- **Commit SHA reporting**: `stageAndCommit` returns `bool`, not the
  resulting SHA, so `reportCommit()` is currently called with an empty
  SHA. Change it to return `QString` (the OID) if your backend needs
  the real commit hash to link into the website.
- The mock grouping in `ApiClient::mockGroups` is intentionally dumb
  (buckets by top-level directory) — replace by pointing `backendUrl`
  at your real backend once the AI-grouping endpoint exists.
