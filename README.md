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

### 1. Harness CLI & MCP
```bash
cd harness
npm install
npm run build
npm test

# Run CLI
./bin/loopin.js --help
# Or link globally: npm link && loopin --help
```

### 2. Backend Server
```bash
cd backend
npm install
npm run dev      # Starts on http://localhost:3000
```

### 3. Frontend Web App
```bash
cd frontend
npm install
npm run dev      # Starts on http://localhost:5173
```
