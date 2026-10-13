import { listRepository } from "../repositories/listRepository";
import { taskRepository } from "../repositories/taskRepository";
import { CreateTaskInput, CreatedTask, TaskDetail,UpdateTaskInput,MoveTaskInput, MovedTask , DeletedTask} from "../types/task";
import { assertActiveMember, assertValidAssignee } from "./access.service";

async function assertValidMoveTarget(taskId: string, newListId: string): Promise<void> {
    const [ taskProjectId, newList ] = await Promise.all([
        taskRepository.getTaskProjectId(taskId),
        listRepository.getListById(newListId)
    ]);

    if(taskProjectId !== newList.projectId) {
        throw new Error('Cannot move a task to a list in different project!');
    }
}

async function moveTask(data: MoveTaskInput, requesterId: string): Promise<MovedTask> {
    // Authorize first, so a non-member learns nothing about lists in other projects
    const projectId = await taskRepository.getTaskProjectId(data.taskId);
    await assertActiveMember(projectId, requesterId);

    await assertValidMoveTarget(data.taskId, data.newListId);
    const movedTask = await taskRepository.moveTask(data);
    return movedTask;
}

async function createTask(data: CreateTaskInput, requesterId: string): Promise<CreatedTask> {
  // The list decides which project the task lands in, so authorize against that project
  const list = await listRepository.getListById(data.listId);
  await assertActiveMember(list.projectId, requesterId);

  if (data.assigneeId) {
    await assertValidAssignee(list.projectId, data.assigneeId);
  }

  return taskRepository.createTask(data);
}

async function getTaskDetail(taskId: string, requesterId: string): Promise<TaskDetail> {
  const task = await taskRepository.getTaskDetail(taskId);
  await assertActiveMember(task.projectId, requesterId);
  return task;
}

async function updateTask(data: UpdateTaskInput, requesterId: string): Promise<TaskDetail> {
  const projectId = await taskRepository.getTaskProjectId(data.taskId);
  await assertActiveMember(projectId, requesterId);

  if (data.assigneeId) {
    await assertValidAssignee(projectId, data.assigneeId);
  }

  return taskRepository.updateTask(data);
}

async function deleteTask(taskId: string, requesterId: string): Promise<DeletedTask> {
  const projectId = await taskRepository.getTaskProjectId(taskId);
  await assertActiveMember(projectId, requesterId);
  return taskRepository.deleteTask(taskId);
}

export const taskService = { createTask, getTaskDetail, updateTask, moveTask, deleteTask };
