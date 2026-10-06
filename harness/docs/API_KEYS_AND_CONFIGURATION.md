# Loopin Harness: API Keys & Configuration Guide 🔑

This guide provides comprehensive instructions for configuring the **Loopin Cowork Harness**, obtaining AI API keys, setting up local LLM providers, and managing workspace configuration.

---

## 1. AI Provider Configuration

Loopin Harness supports four AI backends for atomic commit slicing, merge conflict resolution, and co-work context intelligence:

| Provider | Internet Required? | API Key Required? | Recommended For |
|---|---|---|---|
| **Google Gemini** | Yes | Yes (Free Tier Available) | **Best overall** (fastest, high context window, accurate slicing) |
| **OpenRouter** | Yes | Yes (Pay-as-you-go) | Anthropic Claude, OpenAI GPT-4o, DeepSeek R1 |
| **Ollama** | No | No (100% Local) | Private air-gapped development, offline coding |
| **Heuristic Fallback** | No | No | Built-in rule-based engine (zero configuration needed) |

---

### A. Google Gemini Setup (Recommended)

Google AI Studio provides generous free quotas for developers.

#### Step 1: Obtain a Free API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **"Create API key"** and select or create a Google Cloud project.
4. Copy your API key (starts with `AIzaSy...`).

#### Step 2: Configure in Loopin
You can configure your key in any of the following ways:

- **Option 1: Save globally (Persists across all projects on your machine)**:
  ```bash
  loopin config set geminiApiKey AIzaSyYourKeyHere --global
  loopin config set aiProvider gemini --global
  ```

- **Option 2: Save locally to current repository (`.loopinrc`)**:
  ```bash
  loopin config set geminiApiKey AIzaSyYourKeyHere
  loopin config set aiProvider gemini
  ```

- **Option 3: Set via Environment Variable**:
  ```bash
  export GEMINI_API_KEY="AIzaSyYourKeyHere"
  export LOOPIN_AI_PROVIDER="gemini"
  ```
  Or add it to your project root or `harness/.env`:
  ```ini
  GEMINI_API_KEY=AIzaSyYourKeyHere
  LOOPIN_AI_PROVIDER=gemini
  ```

---

### B. OpenRouter Setup (Multi-Model Gateway)

OpenRouter allows routing requests to models like `claude-3-5-sonnet`, `deepseek-chat`, or `gpt-4o`.

#### Step 1: Obtain an OpenRouter Key
1. Go to [OpenRouter Keys](https://openrouter.ai/keys).
2. Create an account and generate an API key (starts with `sk-or-v1-...`).

#### Step 2: Configure in Loopin
```bash
loopin config set openrouterApiKey sk-or-v1-YourKeyHere --global
loopin config set aiProvider openrouter --global
```
Or via environment:
```bash
export OPENROUTER_API_KEY="sk-or-v1-YourKeyHere"
export LOOPIN_AI_PROVIDER="openrouter"
```

---

### C. Ollama Setup (100% Local & Offline)

For completely private, offline, air-gapped environments without any API keys or network requests.

#### Step 1: Install & Start Ollama
1. Install Ollama:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```
2. Pull a coding model:
   ```bash
   ollama pull codellama
   # or
   ollama pull deepseek-coder-v2
   ```

#### Step 2: Configure in Loopin
```bash
loopin config set aiProvider ollama
loopin config set ollamaUrl http://localhost:11434
loopin config set ollamaModel codellama
```
Or in `harness/.env`:
```ini
LOOPIN_AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=codellama
```

---

### D. Heuristic Fallback Engine (Zero Setup)

If you don't supply any API keys, Loopin Harness **never fails or crashes**. It seamlessly uses an intelligent deterministic AST and architectural heuristic partitioner:
- Categorizes files by architectural subsystem:
  - Configuration & Dependencies (`package.json`, `tsconfig.json`) -> `chore(config)`
  - Database & Migrations (`schema.prisma`, `migrations/`) -> `chore(db)`
  - Core Backend (`controllers/`, `routes/`, `services/`) -> `feat(backend)`
  - Frontend UI (`components/`, `views/`, `styles/`) -> `feat(ui)`
  - Tests (`*.test.ts`, `*.spec.ts`) -> `test(...)`
  - Docs (`*.md`) -> `docs(...)`
- Synthesizes clean 3-way merge conflict resolutions.
- Generates contextual co-work advice from git status and project board tasks.

---

## 2. Loopin Backend & Project Configuration

To link your commits to tasks in the Loopin Supabase database:

### Required Settings
| Setting | Description | Default |
|---|---|---|
| `backendUrl` | URL of the Loopin Node/Express backend | `http://localhost:3000` |
| `projectId` | UUID of the project in the Loopin Supabase database | `ad0936cf-fcec-4f69-8d7f-24a997cdbab2` |
| `userId` | UUID of your user account in Loopin | `c23b1c1e-6598-4a53-8bcb-0d9de5e14e34` |
| `activeTaskId` | (Optional) Active task claimed for this branch/worktree | `(none)` |

### Setting Project & User Details
```bash
# Point to your local or deployed Loopin backend
loopin config set backendUrl http://localhost:3000

# Set your Project ID
loopin config set projectId ad0936cf-fcec-4f69-8d7f-24a997cdbab2

# Set your User ID
loopin config set userId c23b1c1e-6598-4a53-8bcb-0d9de5e14e34
```

---

## 3. Configuration Precedence Hierarchy

Settings are resolved in the following priority order (highest to lowest):

```
1. CLI Flags              (--task <id>, -m "message")
       ↓
2. Environment Variables  (GEMINI_API_KEY, LOOPIN_PROJECT_ID, LOOPIN_BACKEND_URL)
       ↓
3. Local Repo Config      (.loopinrc in current working directory or git root)
       ↓
4. Global User Config     (~/.loopin/config.json in user's home directory)
       ↓
5. Hardcoded Defaults     (http://localhost:3000, Heuristic fallback)
```

### Inspecting Current Configuration
Run:
```bash
loopin config
```
Example Output:
```
⚙  Current Loopin Configuration:
Key               Value                               
────────────────  ────────────────────────────────────
backendUrl        http://localhost:3000               
projectId         ad0936cf-fcec-4f69-8d7f-24a997cdbab2
userId            c23b1c1e-6598-4a53-8bcb-0d9de5e14e34
activeTaskId      (none)                              
activeTaskTitle   (none)                              
aiProvider        gemini                              
geminiApiKey      ********                            
openrouterApiKey  (not set)                           
ollamaUrl         http://localhost:11434              
```
*(Notice API keys are securely masked in the console output).*

---

## 4. Security Best Practices

1. **Never Commit API Keys**:
   - Ensure `.env` and `.loopinrc` (if containing secrets) are in your `.gitignore`.
   - Prefer saving keys globally using `loopin config set geminiApiKey <KEY> --global`, which stores them in `~/.loopin/config.json` inside your user home directory away from the git repo.
2. **Environment Variable Security**:
   - In CI/CD pipelines or Docker containers, pass `GEMINI_API_KEY` and `LOOPIN_BACKEND_URL` as secret environment variables.
