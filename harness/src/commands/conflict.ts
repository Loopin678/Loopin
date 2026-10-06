import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { ConflictResolver } from '../git/conflict.js';
import { getConflictedFiles } from '../git/git.js';
import { fmt } from '../utils/format.js';

export function createConflictCommand(): Command {
  const cmd = new Command('conflict')
    .description('Detect and resolve merge conflicts with AI assistance');

  cmd
    .command('list')
    .description('List currently conflicted files')
    .action(async () => {
      try {
        const files = await getConflictedFiles();
        if (files.length === 0) {
          console.log(fmt.success('No merge conflicts detected.'));
          return;
        }

        console.log(fmt.warn(`Found ${files.length} conflicted file(s):`));
        files.forEach((f) => console.log(`  - ${fmt.red(f)}`));
        console.log(`\nRun ${fmt.cyan('loopin conflict resolve')} to resolve.`);
      } catch (err: any) {
        console.error(fmt.error(`Failed to check conflicts: ${err.message}`));
      }
    });

  cmd
    .command('resolve')
    .description('Resolve all conflicted files using Loopin AI synthesis')
    .option('-a, --auto', 'Automatically stage resolved files', true)
    .action(async (options) => {
      const config = loadConfig();
      const resolver = new ConflictResolver(config);

      try {
        console.log(fmt.bold('🔍 Scanning repository for merge conflicts...'));
        const conflictedFiles = await resolver.findConflicts();

        if (conflictedFiles.length === 0) {
          console.log(fmt.success('No merge conflicts detected in repository.'));
          return;
        }

        console.log(fmt.info(`Attempting resolution for ${conflictedFiles.length} file(s)...`));
        const results = await resolver.resolveAll({ autoStage: options.auto });

        const headers = ['File', 'Status', 'Strategy', 'Details'];
        const rows = results.map((r) => [
          r.filePath,
          r.success ? fmt.green('RESOLVED') : fmt.red('FAILED'),
          fmt.cyan(r.strategy.toUpperCase()),
          r.error || (r.success ? 'Cleanly merged & staged' : 'Requires manual edit'),
        ]);

        console.log('\n' + fmt.table(headers, rows));

        const allOk = results.every((r) => r.success);
        if (allOk) {
          console.log(`\n${fmt.success('All conflicts resolved successfully!')}`);
          console.log(fmt.dim(`You can now run 'loopin commit' to conclude the merge.`));
        } else {
          console.log(`\n${fmt.warn('Some conflicts could not be resolved automatically. Please inspect manually.')}`);
        }
      } catch (err: any) {
        console.error(fmt.error(`Conflict resolution failed: ${err.message}`));
      }
    });

  return cmd;
}
