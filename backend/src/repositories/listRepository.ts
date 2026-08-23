import { prisma } from "../library/prisma";
import { CreateListInput, ListWithoutTasks, ListWithTasks, RenameListInput} from "../types/list";

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
                    assigneeId: true
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

export const listRepository = { createList, getListsByProject, renameList };
