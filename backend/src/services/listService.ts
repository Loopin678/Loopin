import { listRepository } from "../repositories/listRepository";
import { CreateListInput, ListWithoutTasks, ListWithTasks, RenameListInput} from "../types/list";
import { assertActiveMember } from "./access.service";

async function assertUniqueListName(projectId: string, name: string, excludeListId?: string): Promise<void> {
    const lists = await listRepository.getListsByProject(projectId);
    const isDuplicate = lists.some((list) => list.name === name && list.id !== excludeListId);
    if( isDuplicate ) {
        throw new Error('A list with this name already exists in this project!');
    }
}

async function createList(data: CreateListInput, requesterId: string): Promise<ListWithoutTasks> {
    await assertActiveMember(data.projectId, requesterId);
    await assertUniqueListName(data.projectId, data.name);
    const list = await listRepository.createList(data);
    return list;
}

async function getListsByProject(projectId: string, requesterId: string): Promise<ListWithTasks[]> {
  // Non-members, and anyone asking about a project that doesn't exist, get a 403.
  // That also settles the old TODO about nonexistent project ids.
  await assertActiveMember(projectId, requesterId);
  return listRepository.getListsByProject(projectId);
}

async function renameList(data: RenameListInput, requesterId: string): Promise<ListWithoutTasks> {
    const list = await listRepository.getListById(data.listId)
    await assertActiveMember(list.projectId, requesterId);
    await assertUniqueListName(list.projectId, data.name, data.listId);
    const updatedList = await listRepository.renameList(data);
    return updatedList;
}

export const listService = { createList, getListsByProject, renameList };

