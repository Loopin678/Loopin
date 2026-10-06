import { api } from './api';
import { Task } from '../types';

export const tasksService = {
  createTask: async (projectId: string, listId: string, title: string, description?: string, stack?: string): Promise<Task> => {
    // Note: The nested route is /projects/:projectId/tasks
    const response = await api.post(`/projects/${projectId}/tasks`, { listId, title, description, stack });
    return response.data.task;
  },
  getTask: async (taskId: string): Promise<Task> => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data.task;
  },
  updateTask: async (taskId: string, updates: Partial<Task>): Promise<Task> => {
    const response = await api.patch(`/tasks/${taskId}`, updates);
    return response.data.task;
  },
  moveTask: async (taskId: string, newListId: string, newPosition: number): Promise<Task> => {
    const response = await api.patch(`/tasks/${taskId}/move`, { newListId, newPosition });
    return response.data.task;
  },
  deleteTask: async (taskId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
  }
};
