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

export interface Task {
  id: string;
  title: string;
  description: string | null;
  position: number;
  stack: string | null;
  listId: string;
  projectId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: string;
  name: string;
  position: number;
  projectId: string;
  createdAt: string;
}

export interface ListWithTasks extends List {
  tasks: Partial<Task>[];
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  stack: string;
  user?: User;
}
