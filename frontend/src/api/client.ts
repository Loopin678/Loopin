import type { Project, List, Task, Commit, User, ProjectMember, ProjectInvite } from '../types';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('loopin_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('loopin_token', token);
  } else {
    localStorage.removeItem('loopin_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let errorMsg = res.statusText;
    try {
      const errJson = await res.json();
      errorMsg = errJson.message || JSON.stringify(errJson);
    } catch {
      // ignore
    }
    throw new Error(errorMsg || `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const data = await request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      setAuthToken(data.token);
    }
    return data;
  },

  async register(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
    const data = await request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    if (data.token) {
      setAuthToken(data.token);
    }
    return data;
  },

  async getMe(): Promise<User | null> {
    try {
      const data = await request<{ user: User }>('/auth/me');
      return data.user || null;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAuthToken(null);
  },

  // Projects - Scoped strictly to the logged-in user
  async getProjects(): Promise<Project[]> {
    try {
      const data = await request<{ projects: Project[] } | Project[]>('/projects');
      if (Array.isArray(data)) return data;
      return data.projects || [];
    } catch (err) {
      console.error('Failed to load projects:', err);
      return [];
    }
  },

  async getProject(projectId: string): Promise<Project> {
    const data = await request<{ project: Project }>(`/projects/${projectId}`);
    return data.project || data;
  },

  async createProject(name: string, stack: string = 'fullstack'): Promise<Project> {
    const data = await request<{ project: Project }>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, stack }),
    });
    return data.project || (data as unknown as Project);
  },

  // Lists
  async getLists(projectId: string): Promise<List[]> {
    try {
      const data = await request<{ lists: List[] } | List[]>(`/projects/${projectId}/lists`);
      return Array.isArray(data) ? data : (data.lists || []);
    } catch {
      return [];
    }
  },

  async createList(projectId: string, name: string): Promise<List> {
    const data = await request<{ list: List } | List>(`/projects/${projectId}/lists`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return (data as any).list || data;
  },

  async renameList(projectId: string, listId: string, name: string): Promise<List> {
    const data = await request<{ list: List } | List>(`/projects/${projectId}/lists/${listId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    return (data as any).list || data;
  },

  // Tasks
  async getTasks(projectId: string): Promise<Task[]> {
    try {
      const data = await request<{ tasks: Task[] } | Task[]>(`/projects/${projectId}/tasks`);
      return Array.isArray(data) ? data : (data.tasks || []);
    } catch {
      return [];
    }
  },

  async createTask(data: {
    title: string;
    listId: string;
    projectId: string;
    description?: string;
    stack?: string;
    priority?: string;
    dueDate?: string;
    assigneeId?: string;
  }): Promise<Task> {
    const res = await request<{ task: Task } | Task>(`/projects/${data.projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return (res as any).task || res;
  },

  async updateTask(
    taskId: string,
    updates: {
      title?: string;
      description?: string;
      stack?: string;
      priority?: string;
      dueDate?: string;
      assigneeId?: string;
    }
  ): Promise<Task> {
    const data = await request<{ task: Task } | Task>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return (data as any).task || data;
  },

  async moveTask(
    taskId: string,
    newListId: string,
    newPosition: number
  ): Promise<Task> {
    const data = await request<{ task: Task } | Task>(`/tasks/${taskId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ newListId, newPosition }),
    });
    return (data as any).task || data;
  },

  async deleteTask(taskId: string): Promise<void> {
    await request(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  // Commits (Git & Desktop Sync)
  async getCommits(projectId: string): Promise<Commit[]> {
    try {
      const data = await request<{ commits: Commit[] } | Commit[]>(`/projects/${projectId}/commits`);
      return Array.isArray(data) ? data : (data.commits || []);
    } catch {
      return [];
    }
  },

  async reportCommit(data: {
    sha: string;
    message: string;
    projectId: string;
    authorId: string;
    taskIds?: string[];
  }): Promise<Commit> {
    return request<Commit>('/commits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Project Members
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    try {
      const data = await request<{ members: ProjectMember[] } | ProjectMember[]>(`/projects/${projectId}/members`);
      if (Array.isArray(data)) return data;
      return data.members || [];
    } catch {
      return [];
    }
  },

  async addProjectMember(projectId: string, emailOrUserId: string, stack: string = 'fullstack'): Promise<ProjectMember> {
    const isEmail = emailOrUserId.includes('@');
    const body = isEmail ? { email: emailOrUserId, stack } : { userId: emailOrUserId, stack };
    const data = await request<{ member: ProjectMember } | ProjectMember>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return (data as any).member || data;
  },

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    await request(`/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  // Project Invites
  async getProjectInvites(projectId: string): Promise<ProjectInvite[]> {
    try {
      const data = await request<{ invites: ProjectInvite[] } | ProjectInvite[]>(`/projects/${projectId}/invites`);
      if (Array.isArray(data)) return data;
      return data.invites || [];
    } catch {
      return [];
    }
  },

  async sendProjectInvite(projectId: string, email: string, stack: string = 'fullstack', role: string = 'MEMBER'): Promise<ProjectInvite> {
    const data = await request<{ invite: ProjectInvite } | ProjectInvite>(`/projects/${projectId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ email, stack, role }),
    });
    return (data as any).invite || data;
  },

  async cancelProjectInvite(projectId: string, inviteId: string): Promise<void> {
    await request(`/projects/${projectId}/invites/${inviteId}`, {
      method: 'DELETE',
    });
  },

  // User Invites
  async getMyInvites(): Promise<ProjectInvite[]> {
    try {
      const data = await request<{ invites: ProjectInvite[] } | ProjectInvite[]>('/invites/my');
      if (Array.isArray(data)) return data;
      return data.invites || [];
    } catch {
      return [];
    }
  },

  async acceptInvite(inviteId: string): Promise<{ message: string; project?: Project }> {
    return request<{ message: string; project?: Project }>(`/invites/${inviteId}/accept`, {
      method: 'POST',
    });
  },

  async declineInvite(inviteId: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/invites/${inviteId}/decline`, {
      method: 'POST',
    });
  },
};

import axios, { AxiosError } from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || '';

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
  baseURL: `${API_BASE}`,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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

export type { User, Project, ProjectMember, List, Task, Commit, ProjectInvite } from '../types';

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

export interface Message {
  id: string;
  content: string;
  projectId: string;
  senderId: string;
  createdAt: string;
  sender?: User;
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

// ─── Messages ─────────────────────────────────────────────────────────────────
// GET /api/projects/:projectId/messages → 200 Message[] (or { messages: Message[] })
export const messagesApi = {
  list: async (projectId: string) => {
    const res = await apiClient.get<Message[] | { messages: Message[] }>(`/projects/${projectId}/messages`);
    return Array.isArray(res.data) ? res.data : (res.data as any).messages || [];
  },
};
