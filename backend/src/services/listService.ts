import { listRepository } from "../repositories/listRepository";
import { CreateListInput, DeletedListResult, ListWithoutTasks, ListWithTasks, RenameListInput} from "../types/list";
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

// To Do and Done are what the rest of Loopin relies on (new tasks start in To Do,
// "Show completed" and the desktop app's commit suggestions use Done), so they are
// recognised by their kind, not their name: renaming them doesn't make them deletable.
const PROTECTED_KINDS = new Set(['TODO', 'DONE']);

async function deleteList(listId: string, requesterId: string): Promise<DeletedListResult> {
    const list = await listRepository.getListById(listId);
    await assertActiveMember(list.projectId, requesterId);

    if (PROTECTED_KINDS.has(list.kind)) {
        throw new Error('PROTECTED_LIST');
    }

    // Tasks are never thrown away with their list: they go back to To Do
    const lists = await listRepository.getListsByProject(list.projectId);
    const others = lists.filter(l => l.id !== listId);
    const target = others.find(l => l.kind === 'TODO') ?? others[0] ?? null;

    return listRepository.deleteListMovingTasks(listId, target?.id ?? null);
}

export const listService = { createList, getListsByProject, renameList, deleteList };

