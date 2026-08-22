import { TaskSummary } from "./task.js";

export interface CreateListInput {
    name: string;
    projectId: string;
}

export interface ListWithTasks {
    id: string;
    name: string;
    position: number;
    projectId: string;
    createdAt: Date;
    tasks: TaskSummary[];
}