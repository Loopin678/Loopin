import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig, setActiveTask, clearActiveTask } from '../config.js';
import { LoopinApiClient } from '../api.js';
import { LoopinAiClient } from '../ai/client.js';
import { AtomicCommitSlicer } from '../git/slicer.js';
import { ConflictResolver } from '../git/conflict.js';
import { getStatus, getCurrentBranch, getRecentCommits, push, pull, getConflictedFiles } from '../git/git.js';

export function registerMcpTools(server: McpServer): void {
  // 1. loopin_list_tasks
  server.tool(
    'loopin_list_tasks',
    'List all project tasks from the Loopin board with status, assignee, and active state',
    {
      projectId: z.string().optional().describe('Loopin project ID (defaults to configured project)'),
    },
    async ({ projectId }) => {
      const config = loadConfig();
      const pId = projectId || config.projectId;
      const api = new LoopinApiClient(config.backendUrl);

      try {
        const tasks = await api.getProjectTasks(pId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  projectId: pId,
                  activeTaskId: config.activeTaskId || null,
                  tasks: tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    list: t.listTitle || 'Backlog',
                    assignee: t.assigneeName || t.assigneeId || 'Unassigned',
                    stack: t.stack || null,
                    isActive: t.id === config.activeTaskId,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Error fetching tasks: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // 2. loopin_claim_task
  server.tool(
    'loopin_claim_task',
    'Claim/activate a specific task in the workspace so subsequent commits are automatically linked',
    {
      taskId: z.string().describe('ID or ID prefix of the task to activate'),
    },
    async ({ taskId }) => {
      const config = loadConfig();
      const api = new LoopinApiClient(config.backendUrl);

      try {
        const tasks = await api.getProjectTasks(config.projectId);
        const match = tasks.find((t) => t.id === taskId || t.id.startsWith(taskId));
        if (match) {
          setActiveTask(match.id, match.title);
          return {
            content: [
              {
                type: 'text',
                text: `Successfully claimed task #${match.id}: "${match.title}". All future commits will reference this task.`,
              },
            ],
          };
        }
      } catch {
        // Offline claim
      }

      setActiveTask(taskId);
      return {
        content: [
          {
            type: 'text',
            text: `Claimed task #${taskId} in local workspace config.`,
          },
        ],
      };
    }
  );

  // 3. loopin_create_task
  server.tool(
    'loopin_create_task',
    'Create a new task on the Loopin project board',
    {
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      stack: z.string().optional().describe('Stack or component tag (e.g. backend, ui, docs)'),
      listId: z.string().optional().describe('List ID to place task in (defaults to first list)'),
    },
    async ({ title, description, stack, listId }) => {
      const config = loadConfig();
      const api = new LoopinApiClient(config.backendUrl);

      try {
        let targetListId = listId;
        if (!targetListId) {
          const lists = await api.getProjectLists(config.projectId);
          if (lists.length > 0) {
            targetListId = lists[0].id;
          } else {
            return {
              content: [{ type: 'text', text: 'Error: No lists found in project to place task in.' }],
              isError: true,
            };
          }
        }

        const task = await api.createTask({
          projectId: config.projectId,
          title,
          description,
          listId: targetListId,
          stack,
          assigneeId: config.userId,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: 'Task created successfully',
                  task: {
                    id: task.id,
                    title: task.title,
                    listId: task.listId,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to create task: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // 4. loopin_complete_task
  server.tool(
    'loopin_complete_task',
    'Mark a task as completed and move it to the Done column on the board',
    {
      taskId: z.string().optional().describe('Task ID to mark done (defaults to active task)'),
    },
    async ({ taskId }) => {
      const config = loadConfig();
      const targetId = taskId || config.activeTaskId;
      if (!targetId) {
        return {
          content: [{ type: 'text', text: 'No task specified and no active task claimed.' }],
          isError: true,
        };
      }

      const api = new LoopinApiClient(config.backendUrl);
      try {
        const lists = await api.getProjectLists(config.projectId);
        const doneList = lists.find((l) => /done|finish|completed/i.test(l.title)) || lists[lists.length - 1];

        if (doneList) {
          await api.moveTask(targetId, doneList.id, 0);
        }

        if (config.activeTaskId === targetId) {
          clearActiveTask();
        }

        return {
          content: [
            {
              type: 'text',
              text: `Task #${targetId} marked completed and moved to "${doneList?.title || 'Done'}". Active task cleared.`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to complete task: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // 5. loopin_get_context
  server.tool(
    'loopin_get_context',
    'Get current git repository snapshot (branch, dirty files, conflicts) combined with Loopin task context',
    {},
    async () => {
      const config = loadConfig();
      try {
        const [status, branch, recentCommits] = await Promise.all([
          getStatus(),
          getCurrentBranch(),
          getRecentCommits(5),
        ]);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  branch,
                  isClean: status.clean,
                  activeTask: config.activeTaskId
                    ? { id: config.activeTaskId, title: config.activeTaskTitle }
                    : null,
                  changedFilesCount: status.files.length,
                  stagedFiles: status.stagedFiles,
                  unstagedFiles: status.unstagedFiles,
                  untrackedFiles: status.untrackedFiles,
                  conflictedFiles: status.conflictedFiles,
                  recentCommits: recentCommits.map((c) => ({
                    sha: c.sha.substring(0, 7),
                    message: c.message,
                    author: c.author,
                  })),
                  advice:
                    status.conflictedFiles.length > 0
                      ? 'Resolve merge conflicts before committing.'
                      : !status.clean
                        ? 'Use loopin_smart_commit to automatically slice and commit your changes atomically.'
                        : 'Working directory is clean.',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Error fetching context: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // 6. loopin_smart_commit
  server.tool(
    'loopin_smart_commit',
    'Analyze working tree changes, partition them into atomic Conventional Commits, execute them, and sync with Loopin DB',
    {
      autoCommit: z.boolean().default(false).describe('Set true to create git commits; false to preview slices'),
      taskOverride: z.string().optional().describe('Optional task ID to associate with the commit(s)'),
    },
    async ({ autoCommit, taskOverride }) => {
      const config = loadConfig();
      if (taskOverride) {
        config.activeTaskId = taskOverride;
      }

      try {
        const slicer = new AtomicCommitSlicer(config);
        const slices = await slicer.plan();

        if (slices.length === 0) {
          return {
            content: [{ type: 'text', text: 'Working tree is clean. Nothing to commit.' }],
          };
        }

        if (!autoCommit) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'planned',
                    sliceCount: slices.length,
                    slices: slices.map((s) => ({
                      title: s.title,
                      type: s.type,
                      scope: s.scope,
                      files: s.files,
                      reasoning: s.reasoning,
                    })),
                    instruction: 'To execute these commits, call loopin_smart_commit with autoCommit: true.',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const execution = await slicer.execute(slices, { recordToBackend: true });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'committed',
                  commitsCount: execution.commits.length,
                  commits: execution.commits.map((c) => ({
                    sha: c.sha,
                    title: c.title,
                    filesCount: c.files.length,
                    taskIds: c.taskIds,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Smart commit failed: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // 7. loopin_sync_and_push
  server.tool(
    'loopin_sync_and_push',
    'Sync current branch with remote (pull with rebase) and safely push commits',
    {
      remote: z.string().default('origin').describe('Remote name'),
      rebase: z.boolean().default(true).describe('Whether to pull with rebase'),
    },
    async ({ remote, rebase }) => {
      try {
        const pullRes = await pull(rebase);
        const conflicts = await getConflictedFiles();
        if (conflicts.length > 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Merge conflicts encountered in ${conflicts.length} file(s): ${conflicts.join(
                  ', '
                )}. Please resolve conflicts before pushing.`,
              },
            ],
            isError: true,
          };
        }

        const pushRes = await push(remote);
        if (!pushRes.success) {
          return {
            content: [{ type: 'text', text: `Push failed: ${pushRes.output}` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Successfully synced and pushed to ${remote}. ${pullRes.output} ${pushRes.output}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Sync & push failed: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // 8. loopin_resolve_conflict
  server.tool(
    'loopin_resolve_conflict',
    'Detect and resolve git merge conflicts automatically using AI/heuristic synthesis and auto-stage the result',
    {
      filePath: z.string().optional().describe('Specific file to resolve (resolves all if omitted)'),
    },
    async ({ filePath }) => {
      const config = loadConfig();
      const resolver = new ConflictResolver(config);

      try {
        if (filePath) {
          const res = await resolver.resolveFile(filePath);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(res, null, 2),
              },
            ],
          };
        }

        const results = await resolver.resolveAll({ autoStage: true });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Conflict resolution failed: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // 9. loopin_cowork_advice
  server.tool(
    'loopin_cowork_advice',
    'Consult the Loopin Cowork AI for strategic guidance on git workflow, task decomposition, or diff organization',
    {
      query: z.string().describe('Question regarding project velocity, git strategy, or task division'),
    },
    async ({ query }) => {
      const config = loadConfig();
      const ai = new LoopinAiClient(config);
      const api = new LoopinApiClient(config.backendUrl);

      try {
        const [status, branch, recentCommits] = await Promise.all([
          getStatus(),
          getCurrentBranch(),
          getRecentCommits(5),
        ]);

        let tasks: any[] = [];
        try {
          tasks = await api.getProjectTasks(config.projectId);
        } catch {
          // offline
        }

        const activeTask = config.activeTaskId
          ? { id: config.activeTaskId, title: config.activeTaskTitle || 'Active Task' }
          : undefined;

        const advice = await ai.queryCowork({
          question: query,
          branch,
          clean: status.clean,
          changedFilesCount: status.files.length,
          recentCommits,
          tasks,
          activeTask,
        });

        return {
          content: [{ type: 'text', text: advice }],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to generate cowork advice: ${err.message}` }],
          isError: true,
        };
      }
    }
  );
}
