# Loopin 🌀

**The Intelligent Real-Time Workspace & Co-work Harness for Multi-Stack Engineering Teams and AI Agents**

Loopin unifies task management, git workflow orchestration, live notes, and agentic collaboration across web, desktop, CLI, and Model Context Protocol (MCP) environments.

---

## 🌟 Project Architecture

Loopin is structured as a multi-client monorepo:

```
Loopin/
├── harness/     # 🌀 Intelligent Co-work Harness: CLI (`loopin`) and MCP Server for AI agents
├── backend/     # ⚙️  Express & Prisma backend connected to Supabase PostgreSQL pooler
├── frontend/    # 🌐 Modern React + Vite + Tailwind collaborative web workspace
└── desktop/     # 🖥️  C++ / Qt QML native desktop app with local git repo tracking
```

---

## 🌀 Loopin Cowork Harness (`harness/`)

The Loopin Harness transforms AI agents (Claude Code, Cursor, Windsurf, Antigravity) and engineers into disciplined, cohesive collaborators:

- **Smart Atomic Commit Slicer (`loopin commit --auto`)**: Intelligently partitions massive, multi-file diffs into logical Conventional Commits linked directly to project board tasks.
- **Bi-Directional Task Sync (`loopin task list/start/add/done`)**: Keeps your local workspace and Git commits synchronized with the live Supabase project board.
- **AI Merge Conflict Resolver (`loopin conflict resolve`)**: Detects conflict markers, synthesizes clean merges, and auto-stages valid files.
- **Model Context Protocol (MCP) Server (`loopin mcp`)**: Standard stdio server exposing 9 tools to agentic IDEs.
- **Co-work Intelligence (`loopin query`)**: Evaluates repository velocity, diff partitioning, and task assignments.

### Documentation:
- 📖 **[Harness Overview](harness/README.md)**
- 🚀 **[CLI Reference Guide](harness/docs/CLI_REFERENCE.md)**
- 🔑 **[API Keys & Configuration Guide](harness/docs/API_KEYS_AND_CONFIGURATION.md)**
- 🤖 **[MCP Agent Integration Guide](harness/docs/MCP_AGENT_INTEGRATION.md)**

---

## 🚀 Getting Started

### 1. Backend Server (Node.js/Express + Supabase)
The backend handles business logic, database connections, and WebSockets (Socket.io) for real-time features.
```bash
cd backend
npm install
```
**Environment Variables (`backend/.env`):**
Create a `.env` file with the following variables:
```env
PORT=3000
DATABASE_URL="postgres://[user]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
JWT_SECRET="your-development-jwt-secret"
JWT_EXPIRES_IN="7d"
```
**Run the server:**
```bash
npm run build
npm run start    # Starts the API and WebSocket server on http://localhost:3000
```
*(Note: Because of Socket.io, the backend cannot be hosted on Serverless platforms like Netlify/Vercel. Use Render or Railway for production deployment.)*

### 2. Frontend Web App (React + Vite)
```bash
cd frontend
npm install
```
**Run the app:**
```bash
npm run dev      # Starts on http://localhost:5173 with Hot Module Replacement
```
*You can copy your `User ID` from the bottom-left sidebar menu and `Project ID` from the top-right "More actions" menu on any board.*

### 3. Desktop App (C++ / Qt6 QML)
The desktop app allows you to commit code and link it directly to your Loopin tasks. It uses `gemini-2.5-flash` natively to generate intelligent commit messages.
- Open `LoopinSetup.exe` (built via NSIS `makensis installer.nsi`) to install.
- Go to the **Settings** tab in the app and input your `Backend URL` (e.g., `http://localhost:3000`), `Project ID`, and `User ID`.
- To configure OpenRouter credentials, create a `.env` file in the root directory: `OPENROUTER_API_KEY="sk-or-..."`.

### 4. Harness CLI & MCP
```bash
cd harness
npm install
npm run build
npm test

# Run CLI
./bin/loopin.js --help
```
