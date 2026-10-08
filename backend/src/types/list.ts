import { TaskSummary } from "./task";

export interface CreateListInput { // Used when the user creates a list
    name: string;
    projectId: string;
}

export interface ListWithTasks { // Used when loading a frontend page the list with the tasks will be displayed
    id: string;
    name: string;
    position: number;
    projectId: string;
    createdAt: Date;
    tasks: TaskSummary[];
}

export interface ListWithoutTasks { // Used when we need to return a list but there are no tasks in it
  id: string;                        // Mainly used when we need to create a list
  name: string;
  position: number;
  projectId: string;
  createdAt: Date;
}

export interface RenameListInput {
    listId: string;
    name: string;
}