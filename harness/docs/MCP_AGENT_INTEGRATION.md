# Loopin Harness: Model Context Protocol (MCP) Agent Guide 🤖

The Loopin MCP server enables autonomous AI agents (in Claude Code, Cursor, Windsurf, Antigravity, and custom agent harnesses) to intelligently manage git operations, slice atomic commits, resolve merge conflicts, and synchronize with the Loopin project board over standard `stdio`.

---

## 1. Quick Setup for AI Agent Environments

### A. Claude Code (CLI)
Add the Loopin MCP server via the Claude CLI:
```bash
claude mcp add loopin -- node /path/to/Loopin/harness/dist/index.js mcp
```
Or edit `~/.claude/mcp_config.json`:
```json
{
  "mcpServers": {
    "loopin": {
      "command": "node",
      "args": ["/absolute/path/to/Loopin/harness/dist/index.js", "mcp"],
      "env": {
        "LOOPIN_BACKEND_URL": "http://localhost:3000",
        "LOOPIN_PROJECT_ID": "ad0936cf-fcec-4f69-8d7f-24a997cdbab2",
        "LOOPIN_USER_ID": "c23b1c1e-6598-4a53-8bcb-0d9de5e14e34"
      }
    }
  }
}
```

---

### B. Cursor IDE
Open `Settings` -> `Features` -> `MCP Servers` or add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "loopin-harness": {
      "command": "node",
      "args": ["/absolute/path/to/Loopin/harness/dist/index.js", "mcp"],
      "env": {
        "LOOPIN_BACKEND_URL": "http://localhost:3000",
        "LOOPIN_PROJECT_ID": "ad0936cf-fcec-4f69-8d7f-24a997cdbab2",
        "LOOPIN_USER_ID": "c23b1c1e-6598-4a53-8bcb-0d9de5e14e34"
      }
    }
  }
}
```

---

### C. Windsurf IDE
In Windsurf, configure `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "loopin": {
      "command": "node",
      "args": ["/absolute/path/to/Loopin/harness/dist/index.js", "mcp"]
    }
  }
}
```

---

## 2. Exposed MCP Tools Reference

Loopin provides 9 specialized tools to agents:

### 1. `loopin_list_tasks`
- **Purpose**: Retrieves all tasks on the project board with column status, assignee, and active indicator.
- **Parameters**:
  - `projectId` *(optional string)*: Target project ID.
- **Agent Usage**: Call at the start of a session to discover pending backlog items.

---

### 2. `loopin_claim_task`
- **Purpose**: Sets a task as actively claimed by the agent in the local workspace.
- **Parameters**:
  - `taskId` *(required string)*: ID or prefix of the task to claim.
- **Agent Usage**: Call before implementing features so that future commits reference the task automatically.

---

### 3. `loopin_create_task`
- **Purpose**: Creates a new task on the Loopin project board.
- **Parameters**:
  - `title` *(required string)*: Task title.
  - `description` *(optional string)*: Detailed technical description.
  - `stack` *(optional string)*: Stack tag (e.g. `backend`, `ui`, `db`).
  - `listId` *(optional string)*: Destination list ID.

---

### 4. `loopin_complete_task`
- **Purpose**: Moves a task to the "Done" list and clears the workspace active task.
- **Parameters**:
  - `taskId` *(optional string)*: Task to mark done (defaults to active task).

---

### 5. `loopin_get_context`
- **Purpose**: Returns full repository status (branch, dirty files, conflicts, recent commits) combined with active task context.
- **Parameters**: None.
- **Agent Usage**: Call to assess working tree status before and after generating code.

---

### 6. `loopin_smart_commit`
- **Purpose**: Slices working tree changes into atomic Conventional Commits, executes git commits, and syncs each with the Loopin database.
- **Parameters**:
  - `autoCommit` *(boolean, default: false)*: Set `true` to execute commits; `false` to preview proposed slices.
  - `taskOverride` *(optional string)*: Optional task ID to associate with the commits.
- **Agent Usage**: Call with `autoCommit: false` to review slices with the user, then call with `autoCommit: true` to execute.

---

### 7. `loopin_sync_and_push`
- **Purpose**: Pulls remote changes with rebase, checks for conflicts, and pushes commits to the remote.
- **Parameters**:
  - `remote` *(string, default: "origin")*: Git remote.
  - `rebase` *(boolean, default: true)*: Pull with rebase.

---

### 8. `loopin_resolve_conflict`
- **Purpose**: Detects and synthesizes clean resolutions for git merge conflicts and auto-stages the result.
- **Parameters**:
  - `filePath` *(optional string)*: Specific file or all conflicted files.

---

### 9. `loopin_cowork_advice`
- **Purpose**: Queries the Loopin Cowork AI for strategic guidance on git workflow, task decomposition, or diff organization.
- **Parameters**:
  - `query` *(required string)*: The technical or architectural question.

---

## 3. Recommended Agent System Prompt

To configure an AI agent to use Loopin Harness effectively, add this snippet to your agent's system prompt or `.cursorrules`:

```markdown
### Loopin Co-work Rules
1. Before starting a feature or bugfix, use `loopin_list_tasks` to view the backlog and `loopin_claim_task` to activate the task.
2. Never commit 20+ unrelated files at once. Use `loopin_smart_commit` with `autoCommit: true` to automatically partition changes into atomic Conventional Commits.
3. When finished with a task, call `loopin_complete_task` to move it to Done on the project board.
4. If a merge conflict occurs, call `loopin_resolve_conflict` to safely resolve and stage the clean files.
```
