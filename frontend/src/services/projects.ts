import { api } from './api';
import { Project } from '../types';

export const projectsService = {
  getProjectsByUser: async (userId: string): Promise<Project[]> => {
    const response = await api.get(`/projects/user/${userId}`);
    return response.data.projects;
  },
  getProject: async (projectId: string): Promise<Project> => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data.project;
  },
  createProject: async (name: string, userId: string, stack: string): Promise<Project> => {
    const response = await api.post('/projects', { name, userId, stack });
    return response.data.project;
  },
};
