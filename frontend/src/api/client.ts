import axios, { AxiosError } from 'axios';

// Backend runs on port 4000
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register') &&
        window.location.pathname !== '/'
      ) {
        window.location.href = '/login';
      }
    }
    const message =
      (error.response?.data as any)?.message || error.message || 'An error occurred';
    return Promise.reject(new ApiError(message, error.response?.status, error.response?.data));
  }
);

// ─── Types (matching exact Prisma schema) ───────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  googleId?: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  stack: string;
  user?: User;
}

export interface TaskSummary {
  id: string;
  title: string;
  position: number;
  stack: string | null;
  assigneeId: string | null;
  listId: string;
  projectId: string;
}

export interface ListWithTasks {
  id: string;
  name: string;
  position: number;
  projectId: string;
  createdAt: string;
  tasks: TaskSummary[];
}

export interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  position: number;
  stack: string | null;
  listId: string;
  projectId: string;
  assigneeId: string | null;
  commitId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
// POST /api/auth/register  { name, email, password } → 201 { user }
// POST /api/auth/login     { email, password }        → 200 { user }
// POST /api/auth/logout                               → 200 { message }
// GET  /api/auth/me                                   → 200 { user }
// GET  /api/auth/google                               → redirect (use window.location)
export const authApi = {
  register: async (data: { name: string; email: string; password: string }) =>
    (await apiClient.post<{ user: User }>('/auth/register', data)).data,

  login: async (data: { email: string; password: string }) =>
    (await apiClient.post<{ user: User }>('/auth/login', data)).data,

  logout: async () =>
    (await apiClient.post<{ message: string }>('/auth/logout')).data,

  me: async () =>
    (await apiClient.get<{ user: User }>('/auth/me')).data,
};

// ─── Projects ────────────────────────────────────────────────────────────────
// POST  /api/projects                    { name, userId, stack } → 201 { project }
// GET   /api/projects/user/:userId                               → 200 { projects: Project[] }
// GET   /api/projects/:projectId                                 → 200 { project }
// PATCH /api/projects/:projectId         { name }                → 200 { project }
// DELETE /api/projects/:projectId                                → 204
export const projectsApi = {
  create: async (data: { name: string; userId: string; stack: string }) =>
    (await apiClient.post<{ project: Project }>('/projects', data)).data.project,

  listByUser: async (userId: string) =>
    (await apiClient.get<{ projects: Project[] }>(`/projects/user/${userId}`)).data.projects,

  get: async (projectId: string) =>
    (await apiClient.get<{ project: Project }>(`/projects/${projectId}`)).data.project,

  update: async (projectId: string, data: { name: string }) =>
    (await apiClient.patch<{ project: Project }>(`/projects/${projectId}`, data)).data.project,

  delete: async (projectId: string) =>
    await apiClient.delete(`/projects/${projectId}`),
};

// ─── Project Members ──────────────────────────────────────────────────────────
// POST   /api/project/member/:projectId              { userId, stack }  → 201 { member }
// GET    /api/project/member/:projectId                                  → 200 { members: ProjectMember[] }
// GET    /api/project/member/:projectId/:userId                          → 200 { member }
// DELETE /api/project/member/:projectId/:userId                          → 204
// GET    /api/project/member/user/:userId                                → 200 { memberships }
export const membersApi = {
  add: async (projectId: string, data: { userId: string; stack: string }) =>
    (await apiClient.post<{ member: ProjectMember }>(`/project/member/${projectId}`, data)).data.member,

  list: async (projectId: string) =>
    (await apiClient.get<{ members: ProjectMember[] }>(`/project/member/${projectId}`)).data.members,

  get: async (projectId: string, userId: string) =>
    (await apiClient.get<{ member: ProjectMember }>(`/project/member/${projectId}/${userId}`)).data.member,

  remove: async (projectId: string, userId: string) =>
    await apiClient.delete(`/project/member/${projectId}/${userId}`),

  membershipsByUser: async (userId: string) =>
    (await apiClient.get(`/project/member/user/${userId}`)).data.memberships,
};

// ─── Lists ────────────────────────────────────────────────────────────────────
// GET   /api/projects/:projectId/lists              → 200 { lists: ListWithTasks[] }
// POST  /api/projects/:projectId/lists   { name }   → 201 { list }  (409 duplicate name)
// PATCH /api/projects/:projectId/lists/:listId { name } → 200 { list }
export const listsApi = {
  list: async (projectId: string) =>
    (await apiClient.get<{ lists: ListWithTasks[] }>(`/projects/${projectId}/lists`)).data.lists,

  create: async (projectId: string, data: { name: string }) =>
    (await apiClient.post<{ list: ListWithTasks }>(`/projects/${projectId}/lists`, data)).data.list,

  rename: async (projectId: string, listId: string, data: { name: string }) =>
    (await apiClient.patch<{ list: ListWithTasks }>(`/projects/${projectId}/lists/${listId}`, data)).data.list,
};

// ─── Tasks ────────────────────────────────────────────────────────────────────
// POST  /api/projects/:projectId/tasks  { title, listId, description?, stack?, assigneeId? } → 201 { task }
// GET   /api/tasks/:taskId                                                                    → 200 { task }
// PATCH /api/tasks/:taskId              { title?, description?, stack?, assigneeId? }         → 200 { task }
// PATCH /api/tasks/:taskId/move         { newListId, newPosition }                            → 200 { task }
// DELETE /api/tasks/:taskId                                                                   → 200 { deleted: { id, listId, projectId } }
export const tasksApi = {
  create: async (
    projectId: string,
    data: { title: string; listId: string; description?: string; stack?: string; assigneeId?: string }
  ) =>
    (await apiClient.post<{ task: TaskDetail }>(`/projects/${projectId}/tasks`, data)).data.task,

  get: async (taskId: string) =>
    (await apiClient.get<{ task: TaskDetail }>(`/tasks/${taskId}`)).data.task,

  update: async (
    taskId: string,
    data: Partial<{ title: string; description: string | null; stack: string | null; assigneeId: string | null }>
  ) =>
    (await apiClient.patch<{ task: TaskDetail }>(`/tasks/${taskId}`, data)).data.task,

  move: async (taskId: string, data: { newListId: string; newPosition: number }) =>
    (await apiClient.patch<{ task: TaskDetail }>(`/tasks/${taskId}/move`, data)).data.task,

  delete: async (taskId: string) =>
    (await apiClient.delete<{ deleted: { id: string; listId: string; projectId: string } }>(`/tasks/${taskId}`)).data.deleted,
};
