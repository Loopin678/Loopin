import { listRepository } from "../repositories/listRepository";
import { taskRepository } from "../repositories/taskRepository";
import { CreateTaskInput, CreatedTask, TaskDetail,UpdateTaskInput,MoveTaskInput, MovedTask , DeletedTask, MyTask} from "../types/task";import { assertActiveMember, assertValidAssignee } from "./access.service";

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

async function updateTask(
  data: UpdateTaskInput,
  requesterId: string
): Promise<{ task: TaskDetail; previousAssigneeId: string | null }> {
  // One lookup gives us both the project (for the access check) and the current assignee
  const { projectId, assigneeId: previousAssigneeId } = await taskRepository.getTaskAssignment(data.taskId);
  await assertActiveMember(projectId, requesterId);

  if (data.assigneeId) {
    await assertValidAssignee(projectId, data.assigneeId);
  }

  const task = await taskRepository.updateTask(data);
  return { task, previousAssigneeId };
}

async function deleteTask(
  taskId: string,
  requesterId: string
): Promise<{ deleted: DeletedTask; assigneeId: string | null }> {
  // Read the assignee BEFORE the delete: afterwards the row is gone
  const { projectId, assigneeId } = await taskRepository.getTaskAssignment(taskId);
  await assertActiveMember(projectId, requesterId);

  const deleted = await taskRepository.deleteTask(taskId);
  return { deleted, assigneeId };
}

async function getTasksByProject(projectId: string, requesterId: string): Promise<TaskDetail[]> {
  await assertActiveMember(projectId, requesterId);
  return taskRepository.getTasksByProjectId(projectId);
}

async function getMyTasks(userId: string, includeDone: boolean): Promise<MyTask[]> {
  // No assertActiveMember here: this spans every project, so the membership
  // rule is part of the repository query instead
  return taskRepository.getTasksAssignedToUser(userId, includeDone);
}

export const taskService = { createTask, getTaskDetail, updateTask, moveTask, deleteTask, getMyTasks, getTasksByProject };
