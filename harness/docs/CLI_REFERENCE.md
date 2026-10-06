# Loopin Harness: CLI Reference Guide 🚀

The `loopin` command-line interface provides developers and autonomous agents with an intelligent pair-programming harness for Git and project task management.

---

## Command Overview

| Command | Subcommands / Flags | Description |
|---|---|---|
| `loopin task` | `list`, `start`, `add`, `done`, `status` | Manage project board tasks and work context |
| `loopin commit` | `--auto`, `--dry-run`, `--task`, `-m` | Smart Atomic Commit Slicer linked to tasks |
| `loopin sync` | `--no-rebase` | Safe upstream pull with automatic conflict detection |
| `loopin push` | `--remote`, `--branch` | Safe git push to current branch remote |
| `loopin conflict` | `list`, `resolve` | AI-powered merge conflict detection & resolution |
| `loopin query` | `<question>` | Co-work intelligence for velocity, diffs, and tasks |
| `loopin config` | `show`, `set` | Manage local and global harness configuration |
| `loopin mcp` | - | Start the Model Context Protocol stdio server |

---

## 1. Task Management (`loopin task`)

Synchronizes your local Git workspace with the live Loopin project board in Supabase.

### `loopin task list`
Displays all tasks for the current project organized in a formatted table with list column, assignee, stack tag, and active marker (`★`).

```bash
loopin task list
```
**Example Output:**
```text
📋 Tasks for Project: ad0936cf-fcec-4f69-8d7f-24a997cdbab2
ℹ Active Task: #b4f189c2 (Add JWT Authentication)

ID         Title                      List / Status  Assignee   Stack
─────────  ─────────────────────────  ─────────────  ─────────  ────────
★ b4f189c  Add JWT Authentication     In Progress    Arnav      backend
  3a19dc8  Design Landing Page Hero   Backlog        Unassigned ui
  e72b4f0  Setup PostgreSQL Pooler    Done           Arnav      db
```

---

### `loopin task start <taskId>`
Claims and activates a task for your current workspace. The task ID is saved to `.loopinrc`. All subsequent atomic commits created with `loopin commit` will automatically link to this task in the database and append `Refs #<taskId>` to the commit message.

```bash
# Using full UUID or prefix
loopin task start b4f189c2
```
**Output:**
```text
✔ Activated task: #b4f189c2 (Add JWT Authentication)
ℹ Future commits with 'loopin commit' will automatically reference this task.
```

---

### `loopin task status`
Shows the currently claimed task in the workspace.

```bash
loopin task status
```
**Output:**
```text
ℹ Active Task: #b4f189c2 (Add JWT Authentication)
```

---

### `loopin task add "<title>" [options]`
Creates a new task on the Loopin project board.

**Options:**
- `-d, --desc <description>`: Multi-line or detailed description.
- `-s, --stack <stack>`: Architecture stack tag (e.g. `backend`, `frontend`, `db`, `devops`).
- `-l, --list <listId>`: Destination list UUID (defaults to first list/Backlog).

```bash
loopin task add "Implement rate limiting" \
  --desc "Add express-rate-limit to auth endpoints" \
  --stack "backend"
```
**Output:**
```text
✔ Task created: #9f82bc1a (Implement rate limiting)
```

---

### `loopin task done [taskId]`
Marks a task as completed. Moves the task to the "Done" list on the Loopin project board and clears the active task state in `.loopinrc`.

```bash
# Completes current active task:
loopin task done

# Or complete specific task:
loopin task done 9f82bc1a
```
**Output:**
```text
✔ Task #b4f189c2 moved to "Done".
ℹ Cleared active task context.
```

---

## 2. Smart Atomic Commit Slicer (`loopin commit`)

The core innovation of Loopin Harness. When working with large diffs (or when autonomous agents make changes across dozens of files), `loopin commit` automatically parses the diff, groups changes by architectural subsystem, creates discrete Conventional Commits, and records each commit in the Loopin backend.

### Options
| Flag | Description |
|---|---|
| `-n, --dry-run` | Previews planned commit slices and files without touching git |
| `-a, --auto` | Automatically stages and commits all slices sequentially |
| `-t, --task <id>` | Overrides or sets the active task ID to associate with the commits |
| `-m, --message <msg>` | Bypasses automatic slicing to create a single manual commit |

---

### Previewing Slices (`--dry-run`)
```bash
loopin commit --dry-run
```
**Example Output:**
```text
🔍 Analyzing working tree and computing atomic commit slices...

📦 Planned Atomic Commit Slices (3):

[1/3] chore(config): update package.json and tsconfig.json
     Type: chore | Scope: config
     Files: harness/package.json, harness/tsconfig.json
     Reason: Grouped files by architectural subsystem: config

[2/3] feat(backend): add task controller and routes
     Type: feat | Scope: backend
     Files: backend/src/controllers/task.ts, backend/src/routes/task.ts
     Task: #b4f189c2 (Add JWT Authentication)
     Reason: Grouped files by architectural subsystem: backend

[3/3] test(backend): add unit test coverage for tasks
     Type: test | Scope: test
     Files: backend/test/task.test.ts
     Reason: Grouped files by architectural subsystem: test

ℹ Dry-run mode enabled. No commits were created.
```

---

### Executing Slices (`--auto`)
```bash
loopin commit --auto
```
**Example Output:**
```text
🚀 Executing atomic commits and synchronizing with Loopin...
✔ [1/3] 3f8a12c - chore(config): update package.json and tsconfig.json (2 files)
✔ [2/3] 9b2d04e - feat(backend): add task controller and routes (2 files)
✔ [3/3] c14f5e7 - test(backend): add unit test coverage for tasks (1 files)

✔ Successfully created and synced 3 atomic commit(s)!
ℹ All commits linked to active task #b4f189c2
```

---

## 3. Git Synchronization (`loopin sync` & `loopin push`)

### `loopin sync`
Pulls remote updates using `git pull --rebase` and runs an immediate conflict audit:

```bash
loopin sync
```
- If clean: displays upstream changes pulled.
- If merge conflicts detected: alerts the developer and recommends `loopin conflict resolve --auto`.

**Option:**
- `--no-rebase`: Use `git merge` instead of `git rebase`.

---

### `loopin push`
Pushes commits on the current branch safely to the remote repository:

```bash
loopin push

# Or specify remote / branch:
loopin push --remote origin --branch feature/auth
```

---

## 4. AI Conflict Resolver (`loopin conflict`)

Resolves git merge conflicts automatically without manual syntax corruption.

### `loopin conflict list`
Lists all files currently in conflict state (`<<<<<<< HEAD`):
```bash
loopin conflict list
```

---

### `loopin conflict resolve [--auto]`
Scans all conflicted files, sends conflict hunks to AI (or synthesized 3-way heuristics), strips out conflict markers, verifies syntax balance, writes the clean content, and automatically stages the file with `git add`.

```bash
loopin conflict resolve --auto
```
**Example Output:**
```text
🔍 Scanning repository for merge conflicts...
ℹ Attempting resolution for 2 file(s)...

File                           Status    Strategy   Details
─────────────────────────────  ────────  ─────────  ───────────────────────
backend/src/routes/task.ts     RESOLVED  AI         Cleanly merged & staged
harness/package.json           RESOLVED  HEURISTIC  Cleanly merged & staged

✔ All conflicts resolved successfully!
ℹ You can now run 'loopin commit' to conclude the merge.
```

---

## 5. Co-work Intelligence (`loopin query`)

Ask Loopin Cowork AI questions about your repository state, branch velocity, diff partitioning, or task prioritization:

```bash
# Architectural partitioning guidance
loopin query "I have 15 modified files across frontend and backend. How should I partition them?"

# Sprint context
loopin query "What tasks are assigned to me and what should I work on next?"
```

---

## 6. Configuration Management (`loopin config`)

```bash
# View active configuration
loopin config

# Set local project setting (saved to .loopinrc)
loopin config set aiProvider gemini
loopin config set backendUrl http://localhost:3000

# Set global user setting (saved to ~/.loopin/config.json)
loopin config set geminiApiKey AIzaSy... --global
```

---

## 7. MCP Server Mode (`loopin mcp`)

Runs the Model Context Protocol server over `stdio` for agent IDEs and CLI agents:

```bash
loopin mcp
```
*(See `MCP_AGENT_INTEGRATION.md` for full agent setup instructions).*
