import { Request, Response } from "express";
import { listService } from "../services/listService";
import { getIO, notifyMyTasksChanged } from "../library/socket";

export async function getListsByProject(req: Request, res: Response): Promise<void> {
    try {
        const { projectId } = req.params;

        if (typeof projectId !== "string") { // checking whether projectId is a string or not because TS thinks the req.params can be an array or undefined also and may give an error
            res.status(400).json({ message: "Invalid projectId" }); 
            return;
        }
        
        const requesterId = req.user?.id;
        if (!requesterId) {
        res.status(401).json({ message: "Authentication required" });
        return;
        }

        const lists = await listService.getListsByProject(projectId, requesterId);

        res.status(200).json({ lists });
    } catch (error) {
        if (error instanceof Error && error.message === "FORBIDDEN_NOT_PROJECT_MEMBER") {
            res.status(403).json({ message: "You are not a member of this project" });
            return;
        }
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function createList(req: Request, res: Response): Promise<void> {
    try {
        const { projectId } = req.params;
        const { name } = req.body;

        if (typeof projectId !== "string") {
        res.status(400).json({ message: "Invalid projectId" });
        return;
        }

        if (!name || typeof name !== "string") {
        res.status(400).json({ message: "name is required" });
        return;
        }

        const requesterId = req.user?.id;
        if (!requesterId) {
        res.status(401).json({ message: "Authentication required" });
        return;
        }

        const list = await listService.createList({ name, projectId }, requesterId);

        getIO().to(`project:${projectId}`).emit("list:created", list);

        res.status(201).json({ list });
    } catch (error) {
        if (error instanceof Error && error.message === "FORBIDDEN_NOT_PROJECT_MEMBER") {
            res.status(403).json({ message: "You are not a member of this project" });
            return;
        }
        if (error instanceof Error && error.message === "A list with this name already exists in this project!") {
            res.status(409).json({ message: error.message });
            return;
        }
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function renameList(req: Request, res: Response): Promise<void> {
    try {
        const {listId} = req.params; // We are not taking the project id here because we don't need it from the url the rename function in the service gets the project id by iteself
        const { name } = req.body;

        if (typeof listId !== "string") {
            res.status(400).json({ message: "Invalid listId" });
            return;
        }

        if (!name || typeof name !== "string") {
            res.status(400).json({ message: "name is required" });
            return;
        }

        const requesterId = req.user?.id;
        if (!requesterId) {
        res.status(401).json({ message: "Authentication required" });
        return;
        }

        const list = await listService.renameList({ listId, name }, requesterId);

        getIO().to(`project:${list.projectId}`).emit("list:renamed", list);

        res.status(200).json({ list });
    } catch (error) {
        if (error instanceof Error && error.message === "FORBIDDEN_NOT_PROJECT_MEMBER") {
            res.status(403).json({ message: "You are not a member of this project" });
            return;
        }
        if (error instanceof Error && error.message === "List not found!") {
        res.status(404).json({ message: error.message });
        return;
        }

        if (error instanceof Error && error.message === "A list with this name already exists in this project!") {
        res.status(409).json({ message: error.message });
        return;
        }

        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// DELETE /api/projects/:projectId/lists/:listId
// To Do and Done can't be deleted; any tasks in the list move to To Do.
export async function deleteList(req: Request, res: Response): Promise<void> {
    try {
        const { projectId, listId } = req.params;

        if (typeof listId !== "string" || typeof projectId !== "string") {
            res.status(400).json({ message: "Invalid listId" });
            return;
        }

        const requesterId = req.user?.id;
        if (!requesterId) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }

        // The list must belong to the project in the URL
        const existing = await listService.getListsByProject(projectId, requesterId);
        if (!existing.some(l => l.id === listId)) {
            res.status(404).json({ message: "List not found!" });
            return;
        }

        const result = await listService.deleteList(listId, requesterId);

        // Every open board removes the column and re-homes its tasks the same way
        getIO().to(`project:${result.projectId}`).emit("list:deleted", {
            listId: result.listId,
            projectId: result.projectId,
            movedToListId: result.movedToListId,
            movedTaskIds: result.movedTaskIds,
        });
        const firstMoved = result.movedTaskIds[0];
        if (firstMoved) {
            notifyMyTasksChanged(result.assigneeIds, result.projectId, firstMoved);
        }

        res.status(200).json({ deleted: result.listId, movedToListId: result.movedToListId, movedTaskIds: result.movedTaskIds });
    } catch (error) {
        if (error instanceof Error && error.message === "FORBIDDEN_NOT_PROJECT_MEMBER") {
            res.status(403).json({ message: "You are not a member of this project" });
            return;
        }
        if (error instanceof Error && error.message === "PROTECTED_LIST") {
            res.status(409).json({ message: "To Do and Done lists can't be deleted" });
            return;
        }
        if (error instanceof Error && error.message === "List not found!") {
            res.status(404).json({ message: error.message });
            return;
        }
        if (error instanceof Error && error.message === "NO_TARGET_LIST") {
            res.status(409).json({ message: "This list has tasks and there is no other list to move them to" });
            return;
        }
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
