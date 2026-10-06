import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import dotenv from 'dotenv';
import type { HarnessConfig } from './types.js';

// Auto-load .env from cwd or parent directories if present
dotenv.config({ quiet: true });

const DEFAULT_CONFIG: HarnessConfig = {
  backendUrl: process.env.LOOPIN_BACKEND_URL || 'http://localhost:3000',
  projectId: process.env.LOOPIN_PROJECT_ID || 'ad0936cf-fcec-4f69-8d7f-24a997cdbab2',
  userId: process.env.LOOPIN_USER_ID || 'c23b1c1e-6598-4a53-8bcb-0d9de5e14e34',
  aiProvider: (process.env.LOOPIN_AI_PROVIDER as any) || (process.env.GEMINI_API_KEY ? 'gemini' : 'heuristic'),
  geminiApiKey: process.env.GEMINI_API_KEY,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'codellama',
};

export function getGlobalConfigDir(): string {
  const home = os.homedir();
  return path.join(home, '.loopin');
}

export function getGlobalConfigPath(): string {
  return path.join(getGlobalConfigDir(), 'config.json');
}

export function findLocalConfigPath(startDir: string = process.cwd()): string | null {
  let curr = path.resolve(startDir);
  while (true) {
    const candidate = path.join(curr, '.loopinrc');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const gitDir = path.join(curr, '.git');
    if (fs.existsSync(gitDir)) {
      // Reached git root without finding .loopinrc, return path where it can be created
      return candidate;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return path.join(process.cwd(), '.loopinrc');
}

export function loadConfig(): HarnessConfig {
  let config: HarnessConfig = { ...DEFAULT_CONFIG };

  // 1. Global config (~/.loopin/config.json)
  const globalPath = getGlobalConfigPath();
  if (fs.existsSync(globalPath)) {
    try {
      const raw = fs.readFileSync(globalPath, 'utf8');
      const parsed = JSON.parse(raw);
      config = { ...config, ...parsed };
    } catch {
      // Ignore invalid JSON in global config
    }
  }

  // 2. Local config (.loopinrc)
  const localPath = findLocalConfigPath();
  if (localPath && fs.existsSync(localPath)) {
    try {
      const raw = fs.readFileSync(localPath, 'utf8');
      const parsed = JSON.parse(raw);
      config = { ...config, ...parsed };
    } catch {
      // Ignore invalid JSON in local config
    }
  }

  // 3. Environment variable overrides (highest precedence)
  if (process.env.LOOPIN_BACKEND_URL) config.backendUrl = process.env.LOOPIN_BACKEND_URL;
  if (process.env.LOOPIN_PROJECT_ID) config.projectId = process.env.LOOPIN_PROJECT_ID;
  if (process.env.LOOPIN_USER_ID) config.userId = process.env.LOOPIN_USER_ID;
  if (process.env.LOOPIN_ACTIVE_TASK_ID) config.activeTaskId = process.env.LOOPIN_ACTIVE_TASK_ID;
  if (process.env.GEMINI_API_KEY) {
    config.geminiApiKey = process.env.GEMINI_API_KEY;
    if (config.aiProvider === 'heuristic') config.aiProvider = 'gemini';
  }
  if (process.env.OPENROUTER_API_KEY) config.openrouterApiKey = process.env.OPENROUTER_API_KEY;

  return config;
}

export function saveLocalConfig(partial: Partial<HarnessConfig>): void {
  const localPath = findLocalConfigPath() || path.join(process.cwd(), '.loopinrc');
  let current: Record<string, any> = {};
  if (fs.existsSync(localPath)) {
    try {
      current = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    } catch {
      current = {};
    }
  }
  const updated = { ...current, ...partial };
  fs.writeFileSync(localPath, JSON.stringify(updated, null, 2), 'utf8');
}

export function saveGlobalConfig(partial: Partial<HarnessConfig>): void {
  const dir = getGlobalConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const globalPath = getGlobalConfigPath();
  let current: Record<string, any> = {};
  if (fs.existsSync(globalPath)) {
    try {
      current = JSON.parse(fs.readFileSync(globalPath, 'utf8'));
    } catch {
      current = {};
    }
  }
  const updated = { ...current, ...partial };
  fs.writeFileSync(globalPath, JSON.stringify(updated, null, 2), 'utf8');
}

export function setActiveTask(taskId: string, title?: string): void {
  saveLocalConfig({
    activeTaskId: taskId,
    activeTaskTitle: title || undefined,
  });
}

export function clearActiveTask(): void {
  const localPath = findLocalConfigPath();
  if (localPath && fs.existsSync(localPath)) {
    try {
      const current = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      delete current.activeTaskId;
      delete current.activeTaskTitle;
      fs.writeFileSync(localPath, JSON.stringify(current, null, 2), 'utf8');
    } catch {
      // Ignore
    }
  }
}
