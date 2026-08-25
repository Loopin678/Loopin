export interface CreatTaskInput {
    title: string;
    listId: string;
    description?: string;
    stack?: string;
    asigneeId?: string;
}

export interface TaskSummary { // to show the tasks on the list
    id: string;
    title: string;
    position: number;
    stack: string | null;
    assigneeId: string | null;
}

export interface TaskDetail {
    id: string;
    title: string;
    description: string | null;
    stack: string | null;
    listId: string; // to get the list from the modal only like what list it is on
    projectId: string; // to get the different asignees for the task
    assigneeId: string | null;
    commitId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreatedTask {
    id: string;
    title: string;
    description: string | null;
    position: number;
    stack: string | null;
    listId: string;
    projectId: string;
    assigneeId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateTaskInput {
    taskId: string;
    title?: string;
    description?: string;
    stack?: string;
    assigneeId?: string;
}