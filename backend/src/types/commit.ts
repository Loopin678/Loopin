export interface CommitInput {
  sha: string;
  message: string;
  projectId: string;
  authorId: string;
  taskIds?: string[];
}

export interface CommitResponse {
  id: string;
  message: string;
  projectId: string;
  authorId: string;
  createdAt: Date;
  tasks: { id: string; title: string }[];
}
