import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { LoopinAiClient } from '../ai/client.js';
import { LoopinApiClient } from '../api.js';
import { getStatus, getRecentCommits, getCurrentBranch } from '../git/git.js';
import { fmt } from '../utils/format.js';

export function createQueryCommand(): Command {
  return new Command('query')
    .description('Ask Loopin Cowork AI about project status, tasks, git state, or co-work advice')
    .argument('<question>', 'The co-work or architectural question')
    .action(async (question: string) => {
      const config = loadConfig();
      const ai = new LoopinAiClient(config);
      const api = new LoopinApiClient(config.backendUrl);

      try {
        console.log(fmt.bold(`💬 Querying Loopin Cowork Assistant: "${question}"\n`));

        const [status, branch, recentCommits] = await Promise.all([
          getStatus(),
          getCurrentBranch(),
          getRecentCommits(5),
        ]);

        let tasks: any[] = [];
        try {
          tasks = await api.getProjectTasks(config.projectId);
        } catch {
          // offline mode
        }

        const activeTask = config.activeTaskId
          ? {
              id: config.activeTaskId,
              title: config.activeTaskTitle || 'Active Task',
            }
          : undefined;

        const answer = await ai.queryCowork({
          question,
          branch,
          clean: status.clean,
          changedFilesCount: status.files.length,
          recentCommits,
          tasks,
          activeTask,
        });

        console.log(answer);
      } catch (err: any) {
        console.error(fmt.error(`Query failed: ${err.message}`));
      }
    });
}
