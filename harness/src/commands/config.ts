import { Command } from 'commander';
import { loadConfig, saveLocalConfig, saveGlobalConfig } from '../config.js';
import { fmt } from '../utils/format.js';

export function createConfigCommand(): Command {
  const cmd = new Command('config')
    .description('View and update Loopin harness configuration');

  cmd
    .command('show', { isDefault: true })
    .description('Display current configuration settings')
    .action(() => {
      const config = loadConfig();
      console.log(fmt.bold('\n⚙  Current Loopin Configuration:'));

      const headers = ['Key', 'Value'];
      const rows = [
        ['backendUrl', config.backendUrl],
        ['projectId', config.projectId],
        ['userId', config.userId],
        ['activeTaskId', config.activeTaskId || fmt.dim('(none)')],
        ['activeTaskTitle', config.activeTaskTitle || fmt.dim('(none)')],
        ['aiProvider', config.aiProvider],
        ['geminiApiKey', config.geminiApiKey ? '********' : fmt.dim('(not set)')],
        ['openrouterApiKey', config.openrouterApiKey ? '********' : fmt.dim('(not set)')],
        ['ollamaUrl', config.ollamaUrl || fmt.dim('(not set)')],
      ];

      console.log(fmt.table(headers, rows));
    });

  cmd
    .command('set <key> <value>')
    .description('Set a configuration setting')
    .option('-g, --global', 'Save setting to global config (~/.loopin/config.json) instead of local .loopinrc')
    .action((key: string, value: string, options) => {
      const validKeys = [
        'backendUrl',
        'projectId',
        'userId',
        'activeTaskId',
        'activeTaskTitle',
        'aiProvider',
        'geminiApiKey',
        'openrouterApiKey',
        'ollamaUrl',
        'ollamaModel',
      ];

      if (!validKeys.includes(key)) {
        console.error(fmt.error(`Invalid configuration key: "${key}". Valid keys: ${validKeys.join(', ')}`));
        return;
      }

      const partial = { [key]: value };
      if (options.global) {
        saveGlobalConfig(partial);
        console.log(fmt.success(`Saved "${key}" globally.`));
      } else {
        saveLocalConfig(partial);
        console.log(fmt.success(`Saved "${key}" to local workspace config.`));
      }
    });

  return cmd;
}
