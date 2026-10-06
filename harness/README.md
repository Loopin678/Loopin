# Loopin Harness 🌀

**The Intelligent Co-work & Git Management Harness for Humans and AI Agents**

Loopin Harness transforms autonomous agents and engineering teams into cohesive, disciplined collaborators. Instead of treating Git as a dumb file dump or generating chaotic mega-commits, Loopin provides an intelligent **Co-work Harness** that organizes work into atomic Conventional Commits, synchronizes active task context directly with the Loopin backend, and exposes full superpowers through both a unified CLI (`loopin`) and a Model Context Protocol (MCP) server.

---

## Why Loopin Harness?

### The Problem with Agents & Git Today
1. **Mega-commits / Diff Chaos**: Agents frequently touch 30+ files across config, database schemas, backend services, and frontend UI, and bundle them into a single incomprehensible `feat: update all` commit.
2. **Disconnected Backlogs**: Agents write code in isolation without claiming or updating tasks on the team board, resulting in stale boards and lost traceability.
3. **Merge Conflict Panic**: When branches diverge, agents fail to reconcile conflict markers properly, leading to syntax errors or lost code.
4. **Context Blindness**: Reviewers and human teammates have no visibility into what task a commit solved or why specific files were changed together.

### The Loopin Solution
- **Multi-Tier Atomic Commit Slicer**: Analyzes large diffs, categorizes changes by architectural subsystem (config, schema, core, ui, tests, docs), generates Conventional Commit messages, stages them in order, and links them to active tasks.
- **Bi-Directional Task Sync**: Automatically synchronizes with the Loopin Supabase database (`tasks`, `lists`, `commits`).
- **AI & Heuristic Conflict Resolution**: Scans conflict markers, preserves intent from both branches, guarantees syntactic integrity, and auto-stages clean merges.
- **Native MCP Server**: Exposes 9 standardized tools to AI agents running in Claude Code, Cursor, Windsurf, or Antigravity over `stdio`.

---

## Quick Start

### Installation & Build
```bash
cd harness
npm install
npm run build
```

To link `loopin` globally on your machine:
```bash
npm link
```

---

## CLI Reference

### 1. Task Management (`loopin task`)
Manage project tasks and synchronize your active work context:
```bash
# List all tasks on the project board grouped by list
loopin task list

# Claim and activate a task (commits will automatically reference it)
loopin task start <taskId>

# View currently claimed task
loopin task status

# Create a new task directly on the project board
loopin task add "Implement JWT Refresh Tokens" --desc "Add rotation logic" --stack "backend"

# Mark current active task (or specified task) as completed
loopin task done [taskId]
```

### 2. Smart Atomic Commit Slicer (`loopin commit`)
Intelligently slices multi-file changes into logical atomic commits:
```bash
# Preview planned atomic slices without committing
loopin commit --dry-run

# Automatically partition, commit each slice sequentially, and sync to Loopin DB
loopin commit --auto

# Commit and link to a specific task ID
loopin commit --auto --task <taskId>

# Fast single direct commit message
loopin commit -m "feat(auth): add middleware token verification"
```

### 3. Git Synchronization (`loopin sync` & `loopin push`)
```bash
# Pull with rebase from remote and check for merge conflicts
loopin sync

# Safely push current branch commits to remote
loopin push
```

### 4. AI Conflict Resolver (`loopin conflict`)
```bash
# List conflicted files
loopin conflict list

# Automatically resolve conflicts using AI/synthesized merge and auto-stage
loopin conflict resolve --auto
```

### 5. Co-work Assistant (`loopin query`)
Ask the harness questions about git diffs, project velocity, or work division:
```bash
loopin query "What changes are currently uncommitted and how should I partition them?"
loopin query "What is the priority task on the board right now?"
```

### 6. Configuration (`loopin config`)
```bash
# Show current configuration
loopin config

# Update settings locally (.loopinrc) or globally (~/.loopin/config.json)
loopin config set backendUrl http://localhost:3000
loopin config set aiProvider gemini
loopin config set geminiApiKey <YOUR_KEY> --global
```

---

## MCP Server for AI Agents (`loopin mcp`)

Start the stdio Model Context Protocol server:
```bash
loopin mcp
```

### Configuration for Claude Code / Cursor / Windsurf

Add this to your MCP configuration file (e.g. `claude_desktop_config.json` or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "loopin": {
      "command": "node",
      "args": ["/path/to/Loopin/harness/dist/index.js", "mcp"],
      "env": {
        "LOOPIN_BACKEND_URL": "http://localhost:3000",
        "LOOPIN_PROJECT_ID": "ad0936cf-fcec-4f69-8d7f-24a997cdbab2",
        "LOOPIN_USER_ID": "c23b1c1e-6598-4a53-8bcb-0d9de5e14e34"
      }
    }
  }
}
```

### Exposed MCP Tools:
| Tool | Description |
|---|---|
| `loopin_list_tasks` | List all tasks on the Loopin project board with status, assignee, and active state |
| `loopin_claim_task` | Claim/activate a task so subsequent commits reference it |
| `loopin_create_task` | Create a new task on the Loopin project board |
| `loopin_complete_task` | Mark a task as completed and move it to the Done list |
| `loopin_get_context` | Get full git status, dirty files, active task, and recent commit history |
| `loopin_smart_commit` | Partition dirty files into atomic Conventional Commits, execute, and sync to DB |
| `loopin_sync_and_push` | Pull with rebase, detect conflicts, and safely push branch to remote |
| `loopin_resolve_conflict` | Automatically resolve merge conflicts using AI/heuristic synthesis and auto-stage |
| `loopin_cowork_advice` | Consult Loopin Cowork AI on task breakdown, git strategy, or diff organization |

---

## Architecture

```
harness/
├── bin/
│   └── loopin.js            # Executable shebang runner
├── src/
│   ├── index.ts             # CLI entrypoint & Commander orchestration
│   ├── config.ts            # Hierarchical config (.loopinrc, ~/.loopin, env)
│   ├── types.ts             # Type definitions
│   ├── api.ts               # Loopin backend client (Tasks, Lists, Commits)
│   ├── git/
│   │   ├── git.ts           # Porcelain git parser & command execution
│   │   ├── slicer.ts        # Atomic Commit Slicer Engine
│   │   └── conflict.ts      # AI & Heuristic Merge Conflict Resolver
│   ├── ai/
│   │   ├── client.ts        # Multi-provider client (Gemini, OpenRouter, Ollama, Heuristic)
│   │   └── prompts.ts       # Specialized prompts for slicing, conflicts, cowork
│   ├── commands/            # CLI Command Handlers
│   │   ├── task.ts
│   │   ├── commit.ts
│   │   ├── sync.ts
│   │   ├── push.ts
│   │   ├── conflict.ts
│   │   ├── query.ts
│   │   └── config.ts
│   ├── mcp/
│   │   ├── server.ts        # Stdio MCP Server
│   │   └── tools.ts         # Registered MCP Tool implementations
│   └── utils/
│       └── format.ts        # Terminal styling, tables, boxes, colored badges
└── test/
    └── run.ts               # Comprehensive test suite
```
