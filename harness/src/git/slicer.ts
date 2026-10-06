import { getStatus, getDiff, stageFiles, unstageFiles, commit } from './git.js';
import { LoopinAiClient } from '../ai/client.js';
import { LoopinApiClient } from '../api.js';
import type { CommitSlice, HarnessConfig } from '../types.js';

export interface SlicerExecutionResult {
  slices: CommitSlice[];
  commits: Array<{
    sha: string;
    title: string;
    files: string[];
    taskIds: string[];
  }>;
  skipped: boolean;
  message?: string;
}

export class AtomicCommitSlicer {
  private config: HarnessConfig;
  private aiClient: LoopinAiClient;
  private apiClient: LoopinApiClient;

  constructor(config: HarnessConfig) {
    this.config = config;
    this.aiClient = new LoopinAiClient(config);
    this.apiClient = new LoopinApiClient(config.backendUrl);
  }

  async plan(): Promise<CommitSlice[]> {
    const status = await getStatus();

    if (status.conflictedFiles.length > 0) {
      throw new Error(
        `Cannot slice commits while files are in merge conflict (${status.conflictedFiles.join(
          ', '
        )}). Run 'loopin conflict resolve' first.`
      );
    }

    const changedFiles = [
      ...status.stagedFiles,
      ...status.unstagedFiles,
      ...status.untrackedFiles,
    ];

    const uniqueFiles = Array.from(new Set(changedFiles));
    if (uniqueFiles.length === 0) {
      return [];
    }

    // Get diff summary (staged + unstaged)
    const diff = await getDiff(false);
    const stagedDiff = await getDiff(true);
    const combinedDiff = `${stagedDiff}\n${diff}`.trim();

    const activeTask = this.config.activeTaskId
      ? {
          id: this.config.activeTaskId,
          title: this.config.activeTaskTitle || 'Active Task',
        }
      : undefined;

    return this.aiClient.planAtomicSlices({
      files: uniqueFiles,
      diffSummary: combinedDiff || `Untracked new files: ${status.untrackedFiles.join(', ')}`,
      activeTask,
    });
  }

  async execute(
    slices: CommitSlice[],
    options: { recordToBackend?: boolean } = { recordToBackend: true }
  ): Promise<SlicerExecutionResult> {
    if (slices.length === 0) {
      return { slices: [], commits: [], skipped: true, message: 'Nothing to commit.' };
    }

    // Reset staging area so we stage each slice cleanly
    const status = await getStatus();
    if (status.stagedFiles.length > 0) {
      await unstageFiles(status.stagedFiles);
    }

    const createdCommits: Array<{
      sha: string;
      title: string;
      files: string[];
      taskIds: string[];
    }> = [];

    for (const slice of slices) {
      // Stage only files belonging to this slice
      await stageFiles(slice.files);

      // Construct message
      let fullMessage = slice.title;
      if (slice.body && slice.body.trim()) {
        fullMessage += `\n\n${slice.body.trim()}`;
      }

      const sha = await commit(fullMessage);

      // Report to Loopin Backend if requested
      if (options.recordToBackend && this.config.projectId && this.config.userId) {
        try {
          await this.apiClient.reportCommit({
            sha,
            message: fullMessage,
            projectId: this.config.projectId,
            authorId: this.config.userId,
            taskIds: slice.taskIds,
          });
        } catch (err: any) {
          // Backend sync failure should not interrupt the git flow, but we can log
          console.warn(`[warning] Failed to sync commit ${sha.substring(0, 7)} to Loopin DB: ${err.message}`);
        }
      }

      createdCommits.push({
        sha,
        title: slice.title,
        files: slice.files,
        taskIds: slice.taskIds,
      });
    }

    return {
      slices,
      commits: createdCommits,
      skipped: false,
    };
  }
}
