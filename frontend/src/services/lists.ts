import { api } from './api';
import { ListWithTasks, List } from '../types';

export const listsService = {
  getListsByProject: async (projectId: string): Promise<ListWithTasks[]> => {
    const response = await api.get(`/projects/${projectId}/lists`);
    return response.data.lists;
  },
  createList: async (projectId: string, name: string): Promise<List> => {
    const response = await api.post(`/projects/${projectId}/lists`, { name });
    return response.data.list;
  },
  renameList: async (projectId: string, listId: string, name: string): Promise<List> => {
    const response = await api.patch(`/projects/${projectId}/lists/${listId}`, { name });
    return response.data.list;
  }
};
