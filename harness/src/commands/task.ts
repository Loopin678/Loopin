import { Command } from 'commander';
import { loadConfig, setActiveTask, clearActiveTask } from '../config.js';
import { LoopinApiClient } from '../api.js';
import { fmt } from '../utils/format.js';

export function createTaskCommand(): Command {
  const taskCmd = new Command('task')
    .description('Manage project tasks and synchronize active work context');

  // loopin task list
  taskCmd
    .command('list')
    .description('List all project tasks and their status')
    .action(async () => {
      const config = loadConfig();
      const api = new LoopinApiClient(config.backendUrl);

      try {
        const tasks = await api.getProjectTasks(config.projectId);
        if (tasks.length === 0) {
          console.log(fmt.info('No tasks found in project.'));
          return;
        }

        console.log(fmt.bold(`\n📋 Tasks for Project: ${fmt.cyan(config.projectId)}`));
        if (config.activeTaskId) {
          console.log(fmt.info(`Active Task: ${fmt.task(config.activeTaskId, config.activeTaskTitle)}\n`));
        } else {
          console.log('');
        }

        const headers = ['ID', 'Title', 'List / Status', 'Assignee', 'Stack'];
        const rows = tasks.map((t) => {
          const isActive = t.id === config.activeTaskId;
          const idDisplay = isActive ? fmt.green(`★ ${t.id.substring(0, 8)}`) : t.id.substring(0, 8);
          const titleDisplay = isActive ? fmt.bold(fmt.green(t.title)) : t.title;
          const listDisplay = t.listTitle || fmt.dim('Backlog');
          const assigneeDisplay = t.assigneeName || (t.assigneeId ? t.assigneeId.substring(0, 8) : fmt.dim('Unassigned'));
          const stackDisplay = t.stack || fmt.dim('None');

          return [idDisplay, titleDisplay, listDisplay, assigneeDisplay, stackDisplay];
        });

        console.log(fmt.table(headers, rows));
      } catch (err: any) {
        console.error(fmt.error(`Failed to fetch tasks: ${err.message}`));
      }
    });

  // loopin task start <taskId>
  taskCmd
    .command('start <taskId>')
    .description('Claim and activate a task for your current workspace')
    .action(async (taskId: string) => {
      const config = loadConfig();
      const api = new LoopinApiClient(config.backendUrl);

      try {
        const tasks = await api.getProjectTasks(config.projectId);
        const match = tasks.find((t) => t.id === taskId || t.id.startsWith(taskId));

        if (!match) {
          console.error(fmt.error(`Task "${taskId}" not found in project.`));
          return;
        }

        setActiveTask(match.id, match.title);
        console.log(fmt.success(`Activated task: ${fmt.task(match.id, match.title)}`));
        console.log(fmt.dim(`Future commits with 'loopin commit' will automatically reference this task.`));
      } catch (err: any) {
        // Fallback: save ID even if backend offline
        setActiveTask(taskId);
        console.log(fmt.success(`Activated task #${taskId} (offline mode)`));
      }
    });

  // loopin task add <title>
  taskCmd
    .command('add <title>')
    .description('Create a new task in the project board')
    .option('-d, --desc <description>', 'Task description')
    .option('-l, --list <listId>', 'Target list ID')
    .option('-s, --stack <stack>', 'Tech stack tag (e.g. backend, ui, db)')
    .action(async (title: string, options) => {
      const config = loadConfig();
      const api = new LoopinApiClient(config.backendUrl);

      try {
        let listId = options.list;
        if (!listId) {
          const lists = await api.getProjectLists(config.projectId);
          if (lists.length > 0) {
            listId = lists[0].id;
          } else {
            throw new Error('No lists found in project. Please create a list or specify --list.');
          }
        }

        const task = await api.createTask({
          projectId: config.projectId,
          title,
          description: options.desc,
          listId,
          stack: options.stack,
          assigneeId: config.userId,
        });

        console.log(fmt.success(`Task created: ${fmt.task(task.id, task.title)}`));
      } catch (err: any) {
        console.error(fmt.error(`Failed to create task: ${err.message}`));
      }
    });

  // loopin task done [taskId]
  taskCmd
    .command('done [taskId]')
    .description('Mark current or specified task as completed')
    .action(async (taskId?: string) => {
      const config = loadConfig();
      const targetId = taskId || config.activeTaskId;

      if (!targetId) {
        console.error(fmt.error('No task specified and no active task claimed. Run `loopin task start <id>` first.'));
        return;
      }

      const api = new LoopinApiClient(config.backendUrl);
      try {
        const lists = await api.getProjectLists(config.projectId);
        const doneList = lists.find((l) => /done|finish|completed/i.test(l.title)) || lists[lists.length - 1];

        if (doneList) {
          await api.moveTask(targetId, doneList.id, 0);
          console.log(fmt.success(`Task #${targetId.substring(0, 8)} moved to "${doneList.title}".`));
        }

        if (config.activeTaskId === targetId) {
          clearActiveTask();
          console.log(fmt.info('Cleared active task context.'));
        }
      } catch (err: any) {
        console.error(fmt.error(`Failed to complete task: ${err.message}`));
      }
    });

  // loopin task status
  taskCmd
    .command('status')
    .description('Show current active claimed task')
    .action(() => {
      const config = loadConfig();
      if (config.activeTaskId) {
        console.log(fmt.info(`Active Task: ${fmt.task(config.activeTaskId, config.activeTaskTitle)}`));
      } else {
        console.log(fmt.dim('No active task claimed. Use `loopin task start <id>` to activate a task.'));
      }
    });

  return taskCmd;
}
