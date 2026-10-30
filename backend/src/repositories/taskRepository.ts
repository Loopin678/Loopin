import { prisma } from '../library/prisma'
import { Prisma, MembershipStatus, ListKind } from '@prisma/client';
import { CreatedTask, CreateTaskInput, MoveTaskInput, TaskDetail , UpdateTaskInput, MovedTask, DeletedTask, MyTask} from "../types/task";


async function createTask(data: CreateTaskInput): Promise<CreatedTask> {
    const list = await prisma.list.findUnique({
        where: { id: data.listId }
    });

    if(!list) {
        throw new Error('List not found!')
    }

    const lastTask = await prisma.task.findFirst({
        where: { listId: data.listId},
        orderBy: { position: 'desc'}
    });

    const position = lastTask ? lastTask.position + 1 : 0;

    const task = prisma.task.create({
        data: {
            title: data.title,
            description: data.description,
            stack: data.stack,
            assigneeId: data.assigneeId,
            listId: data.listId,
            projectId: list.projectId,
            position
        }
    });

    return task;
} 

async function getTaskDetail(taskId: string): Promise<TaskDetail> {
    const task = await prisma.task.findUnique({
        where: {id: taskId},
        select: {
            id: true,
            title: true,
            description: true,
            stack: true,
            listId: true,
            projectId: true,
            assigneeId: true,
            commitId: true,
            createdAt: true,
            updatedAt: true
        } 
    });

    if (!task) {
        throw new Error('Task not found!')
    }

    return task;
}

async function updateTask(data: UpdateTaskInput): Promise<TaskDetail> {
  try {
    const task = await prisma.task.update({
      where: { id: data.taskId },
      data: {
        title: data.title,
        description: data.description,
        stack: data.stack,
        assigneeId: data.assigneeId
      }
    });
    return task;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new Error('Task not found!');
    }
    throw error;
  }
}

async function moveTask(data: MoveTaskInput): Promise<MovedTask> {
    // Everything runs in one transaction, so a failure halfway through can't
    // leave a list half-renumbered
    return prisma.$transaction(async (tx) => {
        const current = await tx.task.findUnique({
            where: { id: data.taskId },
            select: { listId: true }
        });

        if (!current) {
            throw new Error('Task not found!');
        }

        // Destination list in its current order, without the task being moved.
        // createdAt breaks ties in lists that already contain duplicate positions.
        const destTasks = await tx.task.findMany({
            where: { listId: data.newListId, id: { not: data.taskId } },
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
            select: { id: true, position: true }
        });

        const order = destTasks.map((t) => t.id);
        const oldPositions = new Map(destTasks.map((t) => [t.id, t.position]));

        // Clamp to a valid slot: 0 .. number of tasks already in the list
        const index = Number.isFinite(data.newPosition)
            ? Math.max(0, Math.min(Math.trunc(data.newPosition), order.length))
            : order.length;

        order.splice(index, 0, data.taskId);

        // Rewrite positions 0..n-1 for the destination list
        for (const [i, id] of order.entries()) {
            if (id === data.taskId) {
                await tx.task.update({
                    where: { id },
                    data: { listId: data.newListId, position: i }
                });
            } else if (oldPositions.get(id) !== i) {
                await tx.task.update({ where: { id }, data: { position: i } });
            }
        }

        // Moved to a different list: close the gap it left behind
        if (current.listId !== data.newListId) {
            const sourceTasks = await tx.task.findMany({
                where: { listId: current.listId },
                orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
                select: { id: true, position: true }
            });

            for (const [i, t] of sourceTasks.entries()) {
                if (t.position !== i) {
                    await tx.task.update({ where: { id: t.id }, data: { position: i } });
                }
            }
        }

        return tx.task.findUniqueOrThrow({
            where: { id: data.taskId },
            select: {
                id: true,
                title: true,
                position: true,
                stack: true,
                assigneeId: true,
                listId: true,
                projectId: true
            }
        });
    });
}

async function deleteTask(taskId: string): Promise<DeletedTask> {
  try {
    const task = await prisma.task.delete({
      where: { id: taskId },
      select: { id: true, listId: true, projectId: true }
    });
    return task;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new Error('Task not found!');
    }
    throw error;
  }
}

async function getTaskProjectId(taskId: string): Promise<string> {
    const task = await prisma.task.findUnique({
        where: { id: taskId},
        select: { projectId: true }
    });
    if(!task) {
        throw new Error('Task not found!');
    }

    return task.projectId;
}

// Unassigns every task in a project that belongs to this user (used when they leave or are removed)
async function clearAssigneeForUser(projectId: string, userId: string): Promise<number> {
    const result = await prisma.task.updateMany({
        where: { projectId, assigneeId: userId },
        data: { assigneeId: null }
    });

    return result.count;
}

// Tasks assigned to this user, across all projects.
// Two safety rules live in the query itself:
//  1. the user must still be an ACTIVE member of the task's project (so leftover
//     assignments from projects they left never show up)
//  2. tasks in a DONE list are left out unless includeDone is true
async function getTasksAssignedToUser(userId: string, includeDone: boolean): Promise<MyTask[]> {
    const where: Prisma.TaskWhereInput = {
        assigneeId: userId,
        project: {
            members: { some: { userId, status: MembershipStatus.ACTIVE } }
        },
        ...(includeDone ? {} : { list: { kind: { not: ListKind.DONE } } })
    };

    return prisma.task.findMany({
        where,
        select: {
            id: true,
            title: true,
            position: true,
            stack: true,
            updatedAt: true,
            project: { select: { id: true, name: true } },
            list: { select: { id: true, name: true, kind: true } }
        },
        // Grouped by project, then in board order (To Do, In Progress, Done), then by position
        orderBy: [
            { project: { name: 'asc' } },
            { projectId: 'asc' },
            { list: { position: 'asc' } },
            { position: 'asc' }
        ]
    });
}

// The project a task belongs to, and who it is currently assigned to
async function getTaskAssignment(taskId: string): Promise<{ projectId: string; assigneeId: string | null }> {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { projectId: true, assigneeId: true }
    });

    if (!task) {
        throw new Error('Task not found!');
    }

    return task;
}

export const taskRepository = { createTask, getTaskDetail, updateTask, moveTask, deleteTask, getTaskProjectId, clearAssigneeForUser, getTasksAssignedToUser, getTaskAssignment };