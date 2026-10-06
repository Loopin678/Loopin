import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { AtomicCommitSlicer } from '../git/slicer.js';
import { fmt } from '../utils/format.js';
import { stageFiles, commit } from '../git/git.js';

export function createCommitCommand(): Command {
  const commitCmd = new Command('commit')
    .description('Smart atomic commit slicer: partitions changes into logical Conventional Commits linked to Loopin tasks')
    .option('-a, --auto', 'Automatically stage, slice, commit and record without interactive prompt', false)
    .option('-n, --dry-run', 'Preview atomic commit slices without creating git commits', false)
    .option('-t, --task <taskId>', 'Specify task ID to link to these commits')
    .option('-m, --message <message>', 'Direct single commit message (bypasses automatic slicing)')
    .action(async (options) => {
      const config = loadConfig();
      if (options.task) {
        config.activeTaskId = options.task;
      }

      // If user specified -m, perform direct atomic commit
      if (options.message) {
        try {
          const slicer = new AtomicCommitSlicer(config);
          console.log(fmt.info(`Creating single direct commit: "${options.message}"`));
          const result = await slicer.execute([
            {
              type: 'feat',
              title: options.message,
              files: ['.'],
              taskIds: config.activeTaskId ? [config.activeTaskId] : [],
              reasoning: 'Direct manual commit',
            },
          ]);

          if (result.commits.length > 0) {
            const c = result.commits[0];
            console.log(fmt.success(`Created commit ${fmt.sha(c.sha)}: ${c.title}`));
          }
          return;
        } catch (err: any) {
          console.error(fmt.error(`Commit failed: ${err.message}`));
          process.exit(1);
        }
      }

      // Run Smart Atomic Slicer
      try {
        const slicer = new AtomicCommitSlicer(config);
        console.log(fmt.bold('🔍 Analyzing working tree and computing atomic commit slices...'));

        const slices = await slicer.plan();

        if (slices.length === 0) {
          console.log(fmt.info('Working tree clean. No changes to commit.'));
          return;
        }

        console.log(`\n${fmt.bold(`📦 Planned Atomic Commit Slices (${slices.length}):`)}`);
        slices.forEach((slice, idx) => {
          const num = `[${idx + 1}/${slices.length}]`;
          console.log(`\n${fmt.cyan(num)} ${fmt.bold(slice.title)}`);
          console.log(`     ${fmt.dim('Type:')} ${slice.type} | ${fmt.dim('Scope:')} ${slice.scope || 'general'}`);
          console.log(`     ${fmt.dim('Files:')} ${slice.files.join(', ')}`);
          if (slice.taskIds.length > 0) {
            console.log(`     ${fmt.dim('Task:')} ${slice.taskIds.map((id) => fmt.task(id)).join(', ')}`);
          }
          if (slice.reasoning) {
            console.log(`     ${fmt.dim('Reason:')} ${slice.reasoning}`);
          }
        });

        if (options.dryRun) {
          console.log(`\n${fmt.yellow('ℹ Dry-run mode enabled. No commits were created.')}`);
          return;
        }

        console.log(`\n${fmt.bold('🚀 Executing atomic commits and synchronizing with Loopin...')}`);
        const result = await slicer.execute(slices, { recordToBackend: true });

        result.commits.forEach((c, idx) => {
          const num = `[${idx + 1}/${result.commits.length}]`;
          console.log(
            `${fmt.success(num)} ${fmt.sha(c.sha)} - ${fmt.bold(c.title)} ${fmt.dim(
              `(${c.files.length} files)`
            )}`
          );
        });

        console.log(`\n${fmt.success(`Successfully created and synced ${result.commits.length} atomic commit(s)!`)}`);
        if (config.activeTaskId) {
          console.log(fmt.info(`All commits linked to active task #${config.activeTaskId}`));
        }
      } catch (err: any) {
        console.error(fmt.error(`Slicing failed: ${err.message}`));
        process.exit(1);
      }
    });

  return commitCmd;
}
