import type { Project, List, Task, Commit, User } from '../types';

const API_BASE = '/api';

export const api = {
  // Projects
  async getProjects(): Promise<Project[]> {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      if (!res.ok) {
        // Fallback: if protected or empty, query directly or return empty list
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : (data.projects || []);
    } catch {
      return [];
    }
  },

  async createProject(name: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    return data.project || data;
  },

  // Lists
  async getLists(projectId: string): Promise<List[]> {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/lists`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.lists || []);
    } catch {
      return [];
    }
  },

  async createList(projectId: string, name: string): Promise<List> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    return data.list || data;
  },

  async renameList(projectId: string, listId: string, name: string): Promise<List> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/lists/${listId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    return data.list || data;
  },

  // Tasks
  async getTasks(projectId: string): Promise<Task[]> {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`);
      if (!res.ok) return [];
      const data = await res.json();
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
    assigneeId?: string;
  }): Promise<Task> {
    const res = await fetch(`${API_BASE}/projects/${data.projectId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return result.task || result;
  },

  async updateTask(
    taskId: string,
    updates: {
      title?: string;
      description?: string;
      stack?: string;
      assigneeId?: string;
    }
  ): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    return data.task || data;
  },

  async moveTask(
    taskId: string,
    newListId: string,
    newPosition: number
  ): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newListId, newPosition }),
    });
    const data = await res.json();
    return data.task || data;
  },

  async deleteTask(taskId: string): Promise<void> {
    await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  // Commits (Desktop Sync)
  async getCommits(projectId: string): Promise<Commit[]> {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/commits`);
      if (!res.ok) return [];
      const data = await res.json();
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
    const res = await fetch(`${API_BASE}/commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Users / Auth Mock / Pre-set list from Supabase DB
  getKnownUsers(): User[] {
    return [
      { id: 'c23b1c1e-6598-4a53-8bcb-0d9de5e14e34', name: 'Arnav', email: 'arnavtest@teamsync.com' },
      { id: 'd1685b29-d8e8-4c0c-af00-9fbf4900e348', name: 'Test User', email: 'testuser_1786972564218@example.com' },
      { id: '0e7406f3-fb3e-41b0-ba1d-ea9c1ce30636', name: 'WHO THEY ?', email: 'arnavgandhi16@gmail.com' },
      { id: '82a7fca7-8f24-405f-8ca2-a22fd6197798', name: 'AI Assistant', email: 'ai@loopin.system' },
    ];
  },

  getKnownProjects(): Project[] {
    return [
      { id: 'ad0936cf-fcec-4f69-8d7f-24a997cdbab2', name: 'Loopin Test Project', createdAt: new Date().toISOString() },
      { id: '72df182e-06df-49d8-907d-5103b390e3e9', name: "Shivansh's Project", createdAt: new Date().toISOString() },
      { id: '0f09ff31-c110-4713-a10d-e77e55e5da4f', name: 'Project 2', createdAt: new Date().toISOString() },
      { id: 'c4cda019-9eda-4a83-bbb2-c608833cb2c2', name: 'Test Project', createdAt: new Date().toISOString() },
      { id: '1e3eb1b1-a372-44ef-bb2d-b0c4e42a6edb', name: 'Cross-Project Move Test', createdAt: new Date().toISOString() },
    ];
  },
};
