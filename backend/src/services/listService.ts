import { listRepository } from "../repositories/listRepository";
import { CreateListInput, ListWithoutTasks, ListWithTasks, RenameListInput} from "../types/list";

async function assertUniqueListName(projectId: string, name: string, excludeListId?: string): Promise<void> {
    const lists = await listRepository.getListsByProject(projectId);
    const isDuplicate = lists.some((list) => list.name === name && list.id !== excludeListId);
    if( isDuplicate ) {
        throw new Error('A list with this name already exists in this project!');
    }
}

async function createList(data: CreateListInput): Promise<ListWithoutTasks> {
    await assertUniqueListName(data.projectId, data.name);
    const list = await listRepository.createList(data);
    return list;
}

async function getListsByProject(projectId: string): Promise<ListWithTasks[]> {
  // TODO: once teammate's project-management code is merged into main, add a check here
  // to confirm this projectId actually exists before querying — right now, a nonexistent
  // projectId silently returns an empty array (findMany never throws), which is
  // indistinguishable from "this is a real project with zero lists in it."
  // Likely fix: import projectRepository (or whatever it ends up being called) and
  // call something like `if (!(await projectRepository.exists(projectId))) throw new Error('Project not found')`
  // before calling listRepository.getListsByProject.
  return listRepository.getListsByProject(projectId);
}

async function renameList(data: RenameListInput): Promise<ListWithoutTasks> {
    const list = await listRepository.getListById(data.listId)
    await assertUniqueListName(list.projectId, data.name, data.listId);
    const updatedList = await listRepository.renameList(data);
    return updatedList;
}

export const listService = { createList, getListsByProject, renameList };

