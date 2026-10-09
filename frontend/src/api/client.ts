import type { Project, List, Task, Commit, User } from '../types';

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
};
