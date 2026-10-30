# Loopin Desktop Client

Loopin is a modern desktop application that watches your local Git repositories and automatically groups your uncommitted changes into logical, AI-generated commits. 

## Features
- **GitHub OAuth Login**: Secure authentication via GitHub Device Flow, with tokens stored in the system keychain when built with QtKeychain.
- **AI Auto-Grouping**: Uses Gemini 2.5 Flash (or OpenRouter/Ollama) to analyze your code diffs and organize them into discrete, logical commit groups.
- **Git Integration**: Full local repository management via libgit2. It watches your folder for changes, stages selected files, and pushes directly to your remote.
- **Project Tracking**: Connects to a Node.js backend to track commits against specific projects and tasks.
- **Modern UI**: Built with Qt 6 and QML, featuring a sleek dark-mode interface, glassmorphism, and responsive layouts.

## Technology Stack
- **Frontend/GUI**: Qt 6.11, QML, Qt Quick Controls 2
- **Core Logic**: C++17
- **Git Operations**: libgit2
- **Build System**: CMake
- **Packaging**: NSIS installer (Windows), dmg (macOS), AppImage (Linux), built by GitHub Actions

---

## Installing

Download the latest build from the repository's **Releases** page. Installation steps for each platform are in [packaging/RELEASE_NOTES.md](packaging/RELEASE_NOTES.md), which is also shown on every release.

## Making a release

Releases are built by GitHub Actions ([.github/workflows/desktop-release.yml](../.github/workflows/desktop-release.yml)):

1. Bump `VERSION` in the `project(loopin_desktop VERSION x.y.z ...)` line of [CMakeLists.txt](CMakeLists.txt) and commit.
2. Tag and push: `git tag desktop-vx.y.z && git push origin desktop-vx.y.z`
3. The workflow builds the Windows installer and portable zip, the macOS dmg and the Linux AppImage, then publishes them as a GitHub Release. The tag must match `VERSION` or the release step stops.

To try the packaging without publishing anything, open **Actions → Desktop release → Run workflow**; the files appear as artifacts of that run.

The same scripts work locally:

| Platform | Command | Needs |
|---|---|---|
| Windows (MSYS2 UCRT64 shell) | `packaging/build-windows.sh` | `pacman -S --needed mingw-w64-ucrt-x86_64-{gcc,cmake,ninja,pkgconf,qt6-base,qt6-declarative,qt6-tools,libgit2,qtkeychain-qt6,nsis} zip` |
| macOS | `packaging/build-macos.sh` | `brew install qt libgit2 ninja` |
| Linux | `packaging/build-appimage.sh` | Qt 6.5+, libgit2, CMake, Ninja (downloads linuxdeploy itself) |

Output goes to `desktop/dist/`.

## 🛠 Building for development

Needs Qt 6.5 or newer (Quick, QuickControls2, Network, Concurrent), libgit2 and CMake. Qt6Keychain is optional; without it the GitHub token is kept in the app's settings file.

```bash
cd desktop
cmake -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build
./build/loopin_desktop      # build\loopin_desktop.exe on Windows
```

## 🧪 Running against a local backend

1. In `backend/`, check that `.env` has a working `DATABASE_URL`. Don't run `prisma db push` against the shared team database: it drops columns that were added there directly.
2. Start the API: `npm install` once, then `npm run dev`. It listens on http://localhost:3000.
3. In the desktop app's **Settings** tab, set **Backend URL** to `http://localhost:3000` (the default) and fill in your **Project ID** and **User ID** from the Loopin website. Tasks then load in the **Link to Task** dialogs.

## Environment Variables
If you want to bake a Gemini API key into the app during testing, you can run the executable with the GEMINI_API_KEY environment variable set. Otherwise, users can provide their own key in the Settings UI.
