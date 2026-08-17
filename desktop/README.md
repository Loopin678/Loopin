# Loopin Desktop Client

Loopin is a modern desktop application that watches your local Git repositories and automatically groups your uncommitted changes into logical, AI-generated commits. 

## Features
- **GitHub OAuth Login**: Secure authentication via GitHub Device Flow, with tokens securely stored in the native Windows Credential Manager (via QtKeychain).
- **AI Auto-Grouping**: Uses Gemini 1.5 Flash (or OpenRouter/Ollama) to analyze your code diffs and organize them into discrete, logical commit groups.
- **Git Integration**: Full local repository management via libgit2. It watches your folder for changes, stages selected files, and pushes directly to your remote.
- **Project Tracking**: Connects to a Node.js backend to track commits against specific projects and tasks.
- **Modern UI**: Built with Qt 6 and QML, featuring a sleek dark-mode interface, glassmorphism, and responsive layouts.

## Technology Stack
- **Frontend/GUI**: Qt 6.11, QML, Qt Quick Controls 2
- **Core Logic**: C++17
- **Git Operations**: libgit2
- **Build System**: CMake, MinGW64 (MSYS2)
- **Installer**: NSIS (Modern UI 2)

---

## 🛠 Building from Source (Windows)

### 1. Prerequisites
You need an MSYS2 environment with the MinGW64 toolchain. Install the following packages in your MSYS2 terminal:
`ash
pacman -S mingw-w64-x86_64-gcc mingw-w64-x86_64-cmake mingw-w64-x86_64-ninja
pacman -S mingw-w64-x86_64-qt6 mingw-w64-x86_64-libgit2 mingw-w64-x86_64-qtkeychain-qt6
`

### 2. Building the Executable
Open an MSYS2 MinGW64 terminal and run:
`ash
cd desktop
cmake -B build_release -DCMAKE_BUILD_TYPE=Release -G Ninja
cmake --build build_release
`

### 3. Packaging the Installer (NSIS)
To generate the final LoopinSetup.exe installer for distribution:
1. Ensure makensis is installed: pacman -S mingw-w64-x86_64-nsis
2. Copy your built executable into the dist folder:
   `ash
   cp build_release/loopin_desktop.exe dist/
   `
3. Generate the installer:
   `ash
   makensis installer.nsi
   `
This will output LoopinSetup.exe in the root of the desktop folder.

---

## 🧪 Testing the Backend on Localhost

To test the full integration between the desktop app and your database, you need to run the Node.js backend locally.

### 1. Setup the Database
1. Navigate to the backend folder: cd ../backend
2. Open the .env file and ensure your DATABASE_URL is pointing to your active PostgreSQL/Supabase database.
3. If this is your first time, initialize the database schema:
   `ash
   npx prisma db push
   `

### 2. Start the Server
1. Install backend dependencies:
   `ash
   npm install
   `
2. Start the Express server:
   `ash
   node index.js
   `
   *The server will start running on http://localhost:3000.*

### 3. Connect the Desktop App
1. Launch the Loopin desktop application.
2. Click on the Settings tab.
3. Ensure the Backend URL is set to http://localhost:3000. 
   *(Note: This is the default value for fresh installations).*
4. Open a Git repository in the app. The app will now successfully fetch tasks from your local backend server!

## Environment Variables
If you want to bake a Gemini API key into the app during testing, you can run the executable with the GEMINI_API_KEY environment variable set. Otherwise, users can provide their own key in the Settings UI.
