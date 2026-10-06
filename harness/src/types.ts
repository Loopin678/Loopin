export interface LoopinTask {
  id: string;
  title: string;
  description?: string | null;
  listId: string;
  listTitle?: string;
  position: number;
  stack?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoopinList {
  id: string;
  title: string;
  projectId: string;
  position: number;
}

export interface LoopinCommitRecord {
  id: string;
  sha: string;
  message: string;
  projectId: string;
  authorId: string;
  createdAt: string;
  tasks?: Array<{
    id: string;
    title: string;
  }>;
}

export interface HarnessConfig {
  backendUrl: string;
  projectId: string;
  userId: string;
  activeTaskId?: string;
  activeTaskTitle?: string;
  aiProvider: 'gemini' | 'openrouter' | 'ollama' | 'heuristic';
  geminiApiKey?: string;
  openrouterApiKey?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
}

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted';
  staged: boolean;
}

export interface RepoStatus {
  branch: string;
  clean: boolean;
  files: GitFileStatus[];
  stagedFiles: string[];
  unstagedFiles: string[];
  untrackedFiles: string[];
  conflictedFiles: string[];
}

export interface CommitSlice {
  title: string;
  body?: string;
  scope?: string;
  type: 'feat' | 'fix' | 'refactor' | 'docs' | 'style' | 'test' | 'chore' | 'build' | 'ci';
  files: string[];
  taskIds: string[];
  reasoning: string;
}

export interface ConflictBlock {
  filePath: string;
  startIndex: number;
  endIndex: number;
  ours: string;
  theirs: string;
  oursBranch: string;
  theirsBranch: string;
}
