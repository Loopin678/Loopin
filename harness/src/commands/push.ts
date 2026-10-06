import { Command } from 'commander';
import { push, getCurrentBranch } from '../git/git.js';
import { fmt } from '../utils/format.js';

export function createPushCommand(): Command {
  return new Command('push')
    .description('Push current branch commits safely to remote')
    .option('-r, --remote <remote>', 'Git remote name', 'origin')
    .option('-b, --branch <branch>', 'Target branch name')
    .action(async (options) => {
      try {
        const branch = options.branch || (await getCurrentBranch());
        console.log(fmt.bold(`🚀 Pushing branch ${fmt.cyan(branch)} to ${fmt.dim(options.remote)}...`));

        const res = await push(options.remote, branch);
        if (res.success) {
          console.log(fmt.success(`Successfully pushed to ${options.remote}/${branch}`));
          if (res.output) {
            console.log(fmt.dim(res.output));
          }
        } else {
          console.error(fmt.error(`Push failed: ${res.output}`));
          process.exit(1);
        }
      } catch (err: any) {
        console.error(fmt.error(`Push failed: ${err.message}`));
        process.exit(1);
      }
    });
}
