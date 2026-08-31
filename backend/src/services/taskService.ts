import { listRepository } from "../repositories/listRepository";
import { taskRepository } from "../repositories/taskRepository";
import { CreateTaskInput, CreatedTask, TaskDetail,UpdateTaskInput,MoveTaskInput, MovedTask , DeletedTask} from "../types/task";


async function assertValidMoveTarget(taskId: string, newListId: string): Promise<void> {
    const [ taskProjectId, newList ] = await Promise.all([
        taskRepository.getTaskProjectId(taskId),
        listRepository.getListById(newListId)
    ]);

    if(taskProjectId !== newList.projectId) {
        throw new Error('Cannot move a task to a list in different project!');
    }
}

async function moveTask(data: MoveTaskInput): Promise<MovedTask> {
    await assertValidMoveTarget(data.taskId, data.newListId);
    const movedTask = await taskRepository.moveTask(data);
    return movedTask;
}

async function createTask(data: CreateTaskInput): Promise<CreatedTask> {
  return taskRepository.createTask(data);
}

async function getTaskDetail(taskId: string): Promise<TaskDetail> {
  return taskRepository.getTaskDetail(taskId);
}

async function updateTask(data: UpdateTaskInput): Promise<TaskDetail> {
  return taskRepository.updateTask(data);
}

async function deleteTask(taskId: string): Promise<DeletedTask> {
  return taskRepository.deleteTask(taskId);
}

export const taskService = { createTask, getTaskDetail, updateTask, moveTask, deleteTask };
