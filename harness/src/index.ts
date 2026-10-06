import { Command } from 'commander';
import { createTaskCommand } from './commands/task.js';
import { createCommitCommand } from './commands/commit.js';
import { createPushCommand } from './commands/push.js';
import { createSyncCommand } from './commands/sync.js';
import { createConflictCommand } from './commands/conflict.js';
import { createQueryCommand } from './commands/query.js';
import { createConfigCommand } from './commands/config.js';
import { runMcpServer } from './mcp/server.js';
import { fmt } from './utils/format.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('loopin')
    .description('Loopin Cowork Harness: Intelligent Git & Task Management for humans and AI agents')
    .version('1.0.0');

  // Subcommands
  program.addCommand(createTaskCommand());
  program.addCommand(createCommitCommand());
  program.addCommand(createPushCommand());
  program.addCommand(createSyncCommand());
  program.addCommand(createConflictCommand());
  program.addCommand(createQueryCommand());
  program.addCommand(createConfigCommand());

  // MCP Command
  program
    .command('mcp')
    .description('Start the Model Context Protocol (MCP) stdio server for AI agents')
    .action(async () => {
      await runMcpServer();
    });

  return program;
}

// Auto-run if main module
if (process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.ts') || process.argv[1]?.includes('loopin')) {
  const program = createProgram();
  program.parseAsync(process.argv).catch((err) => {
    console.error(fmt.error(err.message));
    process.exit(1);
  });
}
