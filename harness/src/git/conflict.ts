import fs from 'node:fs';
import path from 'node:path';
import { getConflictedFiles, stageFiles } from './git.js';
import { LoopinAiClient } from '../ai/client.js';
import type { HarnessConfig } from '../types.js';

export interface ConflictResolutionResult {
  filePath: string;
  success: boolean;
  strategy: 'ai' | 'heuristic' | 'failed';
  error?: string;
}

export class ConflictResolver {
  private config: HarnessConfig;
  private aiClient: LoopinAiClient;

  constructor(config: HarnessConfig) {
    this.config = config;
    this.aiClient = new LoopinAiClient(config);
  }

  async findConflicts(): Promise<string[]> {
    return getConflictedFiles();
  }

  async resolveAll(options: { autoStage?: boolean } = { autoStage: true }): Promise<ConflictResolutionResult[]> {
    const conflictedFiles = await this.findConflicts();
    const results: ConflictResolutionResult[] = [];

    for (const filePath of conflictedFiles) {
      const res = await this.resolveFile(filePath);
      if (res.success && options.autoStage) {
        try {
          await stageFiles([filePath]);
        } catch (err: any) {
          res.error = `Failed to stage resolved file: ${err.message}`;
        }
      }
      results.push(res);
    }

    return results;
  }

  async resolveFile(filePath: string): Promise<ConflictResolutionResult> {
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      return { filePath, success: false, strategy: 'failed', error: 'File does not exist' };
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.includes('<<<<<<<')) {
      return { filePath, success: true, strategy: 'heuristic', error: 'No conflict markers found' };
    }

    // 1. Try AI resolution
    try {
      const aiResolved = await this.aiClient.resolveConflict({
        filePath,
        fileContentWithMarkers: content,
      });

      if (aiResolved && !aiResolved.includes('<<<<<<<') && !aiResolved.includes('>>>>>>>')) {
        fs.writeFileSync(fullPath, aiResolved, 'utf8');
        return { filePath, success: true, strategy: 'ai' };
      }
    } catch {
      // Proceed to heuristic
    }

    // 2. Fallback Heuristic Resolution
    try {
      const heuristicResolved = this.heuristicSynthesize(content);
      if (!heuristicResolved.includes('<<<<<<<') && !heuristicResolved.includes('>>>>>>>')) {
        fs.writeFileSync(fullPath, heuristicResolved, 'utf8');
        return { filePath, success: true, strategy: 'heuristic' };
      }
    } catch (err: any) {
      return { filePath, success: false, strategy: 'failed', error: err.message };
    }

    return {
      filePath,
      success: false,
      strategy: 'failed',
      error: 'Could not resolve conflict cleanly without markers',
    };
  }

  private heuristicSynthesize(content: string): string {
    const regex = /<<<<<<<[^\n]*\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>>[^\n]*\n/g;

    return content.replace(regex, (_match, ours: string, theirs: string) => {
      // If either side is completely empty, accept the other side
      if (!ours.trim() && theirs.trim()) return theirs;
      if (ours.trim() && !theirs.trim()) return ours;

      // If one side contains import statements and the other doesn't, combine distinct imports
      const oursLines = ours.split('\n');
      const theirsLines = theirs.split('\n');

      const isImportBlock =
        oursLines.every((l) => !l.trim() || l.trim().startsWith('import ') || l.trim().startsWith('export ')) &&
        theirsLines.every((l) => !l.trim() || l.trim().startsWith('import ') || l.trim().startsWith('export '));

      if (isImportBlock) {
        const set = new Set([...oursLines, ...theirsLines]);
        return Array.from(set).join('\n') + '\n';
      }

      // Default safe heuristic: prioritize ours (current branch), or if theirs has new logic, preserve both with spacing
      return `${ours.trimEnd()}\n\n${theirs.trimStart()}`;
    });
  }
}
