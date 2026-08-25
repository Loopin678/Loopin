import { Task } from '@prisma/client';
import { prisma } from '../library/prisma'
import { CreatedTask, CreatTaskInput, TaskDetail , UpdateTaskInput} from "../types/task";


async function createTask(data: CreatTaskInput): Promise<CreatedTask> {
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
            assigneeId: data.asigneeId,
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
}