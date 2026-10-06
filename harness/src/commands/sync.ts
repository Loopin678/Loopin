import { Command } from 'commander';
import { pull, getConflictedFiles, getCurrentBranch } from '../git/git.js';
import { fmt } from '../utils/format.js';

export function createSyncCommand(): Command {
  return new Command('sync')
    .description('Sync current branch with remote (pull with rebase) and check for conflicts')
    .option('--no-rebase', 'Use merge instead of rebase')
    .action(async (options) => {
      try {
        const branch = await getCurrentBranch();
        console.log(fmt.bold(`🔄 Syncing branch ${fmt.cyan(branch)} with remote...`));

        const res = await pull(options.rebase);
        const conflicts = await getConflictedFiles();

        if (conflicts.length > 0) {
          console.log(fmt.warn(`Merge conflicts detected in ${conflicts.length} file(s):`));
          conflicts.forEach((f) => console.log(`   - ${fmt.red(f)}`));
          console.log(`\nRun ${fmt.cyan('loopin conflict resolve --auto')} to automatically resolve with Loopin AI.`);
          return;
        }

        if (res.success) {
          console.log(fmt.success(`Synced successfully with remote.`));
          if (res.output) {
            console.log(fmt.dim(res.output));
          }
        } else {
          console.error(fmt.error(`Sync encountered an error: ${res.output}`));
        }
      } catch (err: any) {
        console.error(fmt.error(`Sync failed: ${err.message}`));
      }
    });
}
