import type { LoopinTask, LoopinList, LoopinCommitRecord } from './types.js';

export class LoopinApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    let res: Response;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (err: any) {
      throw new Error(`Failed to connect to Loopin server at ${this.baseUrl}: ${err.message}`);
    }

    if (!res.ok) {
      let errText = '';
      try {
        const errJson: any = await res.json();
        errText = errJson.message || JSON.stringify(errJson);
      } catch {
        errText = await res.text();
      }
      throw new Error(`Loopin API error (${res.status} ${res.statusText}): ${errText}`);
    }

    return (await res.json()) as T;
  }

  async getProjectTasks(projectId: string): Promise<LoopinTask[]> {
    return this.request<LoopinTask[]>(`/api/projects/${projectId}/tasks`);
  }

  async getProjectLists(projectId: string): Promise<LoopinList[]> {
    return this.request<LoopinList[]>(`/api/projects/${projectId}/lists`);
  }

  async createTask(params: {
    projectId: string;
    title: string;
    description?: string;
    listId: string;
    stack?: string;
    assigneeId?: string;
  }): Promise<LoopinTask> {
    const res = await this.request<{ task: LoopinTask }>(`/api/projects/${params.projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({
        title: params.title,
        description: params.description,
        listId: params.listId,
        stack: params.stack,
        assigneeId: params.assigneeId,
      }),
    });
    return res.task || (res as any);
  }

  async updateTask(
    taskId: string,
    updates: Partial<{ title: string; description: string; stack: string; assigneeId: string }>
  ): Promise<LoopinTask> {
    const res = await this.request<{ task: LoopinTask }>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.task || (res as any);
  }

  async moveTask(taskId: string, newListId: string, newPosition: number): Promise<LoopinTask> {
    const res = await this.request<{ task: LoopinTask }>(`/api/tasks/${taskId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ newListId, newPosition }),
    });
    return res.task || (res as any);
  }

  async reportCommit(params: {
    sha: string;
    message: string;
    projectId: string;
    authorId: string;
    taskIds?: string[];
  }): Promise<LoopinCommitRecord> {
    return this.request<LoopinCommitRecord>('/api/commits', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getProjectCommits(projectId: string): Promise<LoopinCommitRecord[]> {
    return this.request<LoopinCommitRecord[]>(`/api/projects/${projectId}/commits`);
  }
}
