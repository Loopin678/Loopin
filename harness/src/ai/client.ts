import type { HarnessConfig, CommitSlice } from '../types.js';
import { buildSlicingPrompt, buildConflictPrompt, buildQueryPrompt } from './prompts.js';

export class LoopinAiClient {
  private config: HarnessConfig;

  constructor(config: HarnessConfig) {
    this.config = config;
  }

  async generate(prompt: string): Promise<string> {
    const provider = this.config.aiProvider;

    if (provider === 'gemini' && this.config.geminiApiKey) {
      try {
        return await this.callGemini(prompt);
      } catch (err: any) {
        // Fallback gracefully if rate-limited or offline
        return '';
      }
    }

    if (provider === 'openrouter' && this.config.openrouterApiKey) {
      try {
        return await this.callOpenRouter(prompt);
      } catch (err: any) {
        return '';
      }
    }

    if (provider === 'ollama') {
      try {
        return await this.callOllama(prompt);
      } catch (err: any) {
        return '';
      }
    }

    return '';
  }

  private async callGemini(prompt: string): Promise<string> {
    const key = this.config.geminiApiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${err}`);
    }

    const data = (await res.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');
    return text.trim();
  }

  private async callOpenRouter(prompt: string): Promise<string> {
    const key = this.config.openrouterApiKey;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API error (${res.status}): ${err}`);
    }

    const data = (await res.json()) as any;
    return data?.choices?.[0]?.message?.content?.trim() || '';
  }

  private async callOllama(prompt: string): Promise<string> {
    const url = `${this.config.ollamaUrl || 'http://localhost:11434'}/api/generate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.ollamaModel || 'codellama',
        prompt,
        stream: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama API error (${res.status}): ${err}`);
    }

    const data = (await res.json()) as any;
    return data.response?.trim() || '';
  }

  async planAtomicSlices(params: {
    files: string[];
    diffSummary: string;
    activeTask?: { id: string; title: string };
  }): Promise<CommitSlice[]> {
    // Attempt AI-driven slicing first
    if (this.config.aiProvider !== 'heuristic' && (this.config.geminiApiKey || this.config.openrouterApiKey)) {
      try {
        const prompt = buildSlicingPrompt(params);
        const response = await this.generate(prompt);
        if (response) {
          const jsonText = response.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          const parsed = JSON.parse(jsonText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Validate all files exist
            const allAssigned = new Set<string>();
            const slices: CommitSlice[] = [];
            for (const item of parsed) {
              if (item.files && item.files.length > 0 && item.title) {
                item.files.forEach((f: string) => allAssigned.add(f));
                slices.push({
                  title: item.title,
                  body: item.body,
                  scope: item.scope,
                  type: item.type || 'feat',
                  files: item.files,
                  taskIds: params.activeTask ? [params.activeTask.id] : [],
                  reasoning: item.reasoning || '',
                });
              }
            }
            // Check if any files were missed by AI; if so, append them in a leftover slice
            const unassigned = params.files.filter((f) => !allAssigned.has(f));
            if (unassigned.length > 0) {
              slices.push({
                title: `chore: update remaining files`,
                files: unassigned,
                type: 'chore',
                taskIds: params.activeTask ? [params.activeTask.id] : [],
                reasoning: 'Leftover files not included in AI clusters',
              });
            }
            return slices;
          }
        }
      } catch {
        // Fall back to heuristic partition
      }
    }

    // Heuristic Deterministic Slicer
    return this.heuristicPartition(params);
  }

  private heuristicPartition(params: {
    files: string[];
    diffSummary: string;
    activeTask?: { id: string; title: string };
  }): CommitSlice[] {
    const { files, activeTask } = params;
    const taskRef = activeTask ? `\n\nRefs #${activeTask.id}` : '';

    // If small number of files (<= 2), keep as single atomic commit
    if (files.length <= 2) {
      const type = files.some((f) => f.includes('test') || f.includes('spec'))
        ? 'test'
        : files.some((f) => f.endsWith('.md'))
          ? 'docs'
          : files.some((f) => f.includes('config') || f.endsWith('.json'))
            ? 'chore'
            : 'feat';

      const scope = files[0].split('/')[0] || 'core';
      return [
        {
          type,
          scope,
          title: `${type}(${scope}): update ${files.join(', ')}`,
          body: `Changes in ${files.join(', ')}${taskRef}`,
          files,
          taskIds: activeTask ? [activeTask.id] : [],
          reasoning: 'Small cohesive change packaged together',
        },
      ];
    }

    // Partition into subsystem clusters
    const clusters: Record<string, { type: CommitSlice['type']; scope: string; files: string[] }> = {
      config: { type: 'chore', scope: 'config', files: [] },
      db: { type: 'chore', scope: 'db', files: [] },
      backend: { type: 'feat', scope: 'backend', files: [] },
      frontend: { type: 'feat', scope: 'frontend', files: [] },
      harness: { type: 'feat', scope: 'harness', files: [] },
      desktop: { type: 'feat', scope: 'desktop', files: [] },
      test: { type: 'test', scope: 'test', files: [] },
      docs: { type: 'docs', scope: 'docs', files: [] },
      misc: { type: 'chore', scope: 'misc', files: [] },
    };

    for (const file of files) {
      const lower = file.toLowerCase();
      if (lower.endsWith('.md') || lower.startsWith('docs/')) {
        clusters.docs.files.push(file);
      } else if (lower.includes('test') || lower.includes('spec') || lower.endsWith('.test.ts')) {
        clusters.test.files.push(file);
      } else if (lower.includes('prisma') || lower.includes('migration') || lower.endsWith('.sql')) {
        clusters.db.files.push(file);
      } else if (lower.includes('package.json') || lower.includes('tsconfig') || lower.startsWith('.github')) {
        clusters.config.files.push(file);
      } else if (file.startsWith('harness/')) {
        clusters.harness.files.push(file);
      } else if (file.startsWith('desktop/')) {
        clusters.desktop.files.push(file);
      } else if (file.startsWith('frontend/') || lower.includes('/components/') || lower.includes('/views/')) {
        clusters.frontend.files.push(file);
      } else if (file.startsWith('backend/') || lower.includes('/controllers/') || lower.includes('/routes/')) {
        clusters.backend.files.push(file);
      } else {
        clusters.misc.files.push(file);
      }
    }

    const slices: CommitSlice[] = [];
    for (const [key, cluster] of Object.entries(clusters)) {
      if (cluster.files.length === 0) continue;
      const title = `${cluster.type}(${cluster.scope}): update ${cluster.files.length} file(s)`;
      const body = cluster.files.map((f) => `- ${f}`).join('\n') + taskRef;
      slices.push({
        type: cluster.type,
        scope: cluster.scope,
        title,
        body,
        files: cluster.files,
        taskIds: activeTask ? [activeTask.id] : [],
        reasoning: `Grouped files by architectural subsystem: ${key}`,
      });
    }

    return slices;
  }

  async resolveConflict(params: {
    filePath: string;
    fileContentWithMarkers: string;
  }): Promise<string | null> {
    if (this.config.aiProvider !== 'heuristic' && (this.config.geminiApiKey || this.config.openrouterApiKey)) {
      try {
        const prompt = buildConflictPrompt(params);
        const resolved = await this.generate(prompt);
        if (resolved && !resolved.includes('<<<<<<<') && !resolved.includes('>>>>>>>')) {
          return resolved.trim();
        }
      } catch {
        // Fall back to heuristic resolution
      }
    }
    return null;
  }

  async queryCowork(params: {
    question: string;
    branch: string;
    clean: boolean;
    changedFilesCount: number;
    recentCommits: Array<{ sha: string; message: string; author: string }>;
    tasks: Array<{ id: string; title: string; listTitle?: string }>;
    activeTask?: { id: string; title: string };
  }): Promise<string> {
    if (this.config.aiProvider !== 'heuristic' && (this.config.geminiApiKey || this.config.openrouterApiKey)) {
      try {
        const prompt = buildQueryPrompt(params);
        const answer = await this.generate(prompt);
        if (answer) return answer;
      } catch {
        // Fallback
      }
    }

    // Heuristic Contextual Response
    const activeStr = params.activeTask
      ? `Active Task: #${params.activeTask.id} - ${params.activeTask.title}`
      : 'No active task claimed.';

    const unassignedTasks = params.tasks.filter((t) => !t.listTitle?.toLowerCase().includes('done')).length;

    return `### Loopin Co-work Context
- **Branch**: \`${params.branch}\` (${params.clean ? 'Working tree clean' : `${params.changedFilesCount} files modified`})
- **Task Status**: ${activeStr}
- **Open Tasks**: ${unassignedTasks} pending items on project board.
- **Recent Activity**: Last commit is "${params.recentCommits[0]?.message || 'N/A'}" by ${params.recentCommits[0]?.author || 'N/A'}.

**Recommendation**: 
${
  !params.clean
    ? `You have uncommitted changes. Use \`loopin commit --auto\` to slice them into atomic Conventional Commits and sync with task #${params.activeTask?.id || '<id>'}.`
    : `Working tree is clean. Run \`loopin task list\` to pick the next prioritized item or \`loopin sync\` to update from upstream.`
}`;
  }
}
