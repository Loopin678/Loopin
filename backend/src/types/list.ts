import { TaskSummary } from "./task";
import { ListKind } from "@prisma/client";

export interface CreateListInput { // Used when the user creates a list
    name: string;
    projectId: string;
}

export interface ListWithTasks { // Used when loading a frontend page the list with the tasks will be displayed
    id: string;
    name: string;
    position: number;
    kind: ListKind;
    projectId: string;
    createdAt: Date;
    tasks: TaskSummary[];
}

export interface ListWithoutTasks { // Used when we need to return a list but there are no tasks in it
    id: string;                        // Mainly used when we need to create a list
    name: string;
    position: number;
    kind: ListKind;
    projectId: string;
    createdAt: Date;
}

// What deleting a list did, so every open board can apply the same change
export interface DeletedListResult {
    listId: string;
    projectId: string;
    movedToListId: string | null; // null when the list was empty
    movedTaskIds: string[];
    assigneeIds: string[]; // whose "My tasks" changed (status of their task changed)
}

export interface RenameListInput {
    listId: string;
    name: string;
}