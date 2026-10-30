export interface User {
  id: string;
  name: string;
  username?: string | null;
  email: string;
  googleId?: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  members?: ProjectMember[];
}

export type MemberRole = 'OWNER' | 'MEMBER';
export type MembershipStatus = 'ACTIVE' | 'PENDING';

// The only user fields the server sends inside a member row
export interface MemberUser {
  id: string;
  name: string;
  username: string | null;
}

export type ListKind = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CUSTOM';

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  stack: string;
  role: MemberRole;
  status: MembershipStatus;
  user?: MemberUser;
}

export interface ProjectInvite {
  id: string;
  projectId: string;
  email: string;
  stack: string;
  role?: string;
  invitedById: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  project?: {
    id: string;
    name: string;
  };
  invitedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface List {
  id: string;
  name: string;
  position: number;
  projectId: string;
  createdAt?: string;
}

export interface ListWithTasks extends List {
  tasks: Partial<Task>[];
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
  commitId?: string | null;
  priority?: "low" | "medium" | "high" | string | null;
  dueDate?: string | null;
  assignee?: { id: string; name: string; username: string | null } | null;
  assigneeAvatar?: string;
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
