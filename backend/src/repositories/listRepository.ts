import { prisma } from "../library/prisma";
import { CreateListInput, DeletedListResult, ListWithoutTasks, ListWithTasks, RenameListInput} from "../types/list";

async function createList(data: CreateListInput): Promise<ListWithoutTasks> {
    const lastList = await prisma.list.findFirst({
        where : {projectId: data.projectId},
        orderBy: {position: 'desc'}
    })

    const position = lastList ? lastList.position + 1 : 0;

    const list = await prisma.list.create({
        data: {
            name: data.name,
            projectId: data.projectId,
            position
        }
    });

    return list;
}

async function getListsByProject(projectId: string): Promise<ListWithTasks[]> {
    const lists = await prisma.list.findMany({
        where: { projectId },
        orderBy: { position: 'asc'},
        include: {
            tasks: {
                orderBy: {position: 'asc'},
                select: {
                    id: true,
                    title: true,
                    position: true,
                    stack: true,
                    priority: true,
                    dueDate: true,
                    assigneeId: true,
                    createdAt: true,
                    updatedAt: true
                }
            }
        }
    });

    return lists;
}

async function renameList(data: RenameListInput): Promise<ListWithoutTasks>{
    const updatedList = await prisma.list.update({
        where: { id: data.listId },
        data: {name: data.name }
    });

    return updatedList;
}

async function getListById(listId: string): Promise<ListWithoutTasks>{
    const list = await prisma.list.findUnique({
        where: { id: listId }
    });
    if(!list) {
        throw new Error('List not found!');
    }
    return list;
}

// Deletes a list and moves its tasks to the end of another list, in one transaction
// so a crash can never leave tasks pointing at a list that no longer exists.
async function deleteListMovingTasks(listId: string, targetListId: string | null): Promise<DeletedListResult> {
    return prisma.$transaction(async (tx) => {
        const list = await tx.list.findUnique({ where: { id: listId } });
        if (!list) throw new Error('List not found!');

        const tasks = await tx.task.findMany({
            where: { listId },
            orderBy: { position: 'asc' },
            select: { id: true, assigneeId: true },
        });

        if (tasks.length > 0) {
            if (!targetListId) throw new Error('NO_TARGET_LIST');
            const last = await tx.task.findFirst({
                where: { listId: targetListId },
                orderBy: { position: 'desc' },
                select: { position: true },
            });
            let next = last ? last.position + 1 : 0;
            for (const t of tasks) {
                await tx.task.update({ where: { id: t.id }, data: { listId: targetListId, position: next++ } });
            }
        }

        await tx.list.delete({ where: { id: listId } });

        return {
            listId,
            projectId: list.projectId,
            movedToListId: tasks.length > 0 ? targetListId : null,
            movedTaskIds: tasks.map(t => t.id),
            assigneeIds: Array.from(new Set(tasks.map(t => t.assigneeId).filter((id): id is string => !!id))),
        };
    });
}

export const listRepository = { createList, getListsByProject, renameList, getListById, deleteListMovingTasks };


