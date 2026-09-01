import { Request, Response } from "express";
import { listService } from "../services/listService";

export async function getListsByProject(req: Request, res: Response): Promise<void> {
    try {
        const { projectId } = req.params;

        if (typeof projectId !== "string") { // checking whether projectId is a string or not because TS thinks the req.params can be an array or undefined also and may give an error
            res.status(400).json({ message: "Invalid projectId" }); 
            return;
        }
        
        const lists = await listService.getListsByProject(projectId);

        res.status(200).json({ lists });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function createList(req: Request, res: Response): Promise<void> {
    try {
        const { projectId } = req.params;
        const name = req.body;

        if (typeof projectId !== "string") {
        res.status(400).json({ message: "Invalid projectId" });
        return;
        }

        if (!name || typeof name !== "string") {
        res.status(400).json({ message: "name is required" });
        return;
        }

        const list = listService.createList({ name, projectId});

        res.status(201).json({ list });
    } catch (error) {
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

        const list = await listService.renameList({ listId, name });

        res.status(200).json({ list });
    } catch (error) {
        if (error instanceof Error && error.message === "List not found") {
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