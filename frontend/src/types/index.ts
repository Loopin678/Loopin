export interface User {
  id: string;
  name: string;
  email: string;
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

export interface List {
  id: string;
  name: string;
  position: number;
  projectId: string;
  createdAt?: string;
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
  commitId: string | null;
  priority?: string | null;
  dueDate?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LinkedTask {
  id: string;
  title?: string;
}

export interface Commit {
  id: string;
  message: string;
  projectId: string;
  authorId: string;
  createdAt: string;
  tasks?: LinkedTask[];
}
