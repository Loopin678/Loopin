import { Request, Response } from "express";
import { taskService } from "../services/taskService";

export async function createTask(req: Request, res: Response): Promise<void> {
  try {
    const { title, listId, description, stack, assigneeId } = req.body;
// Again here we are not taking the project id from the params because we need to first create a task using the service 
// And then only we can check whether the project id in the url is same as the one found up by the repository function using the listId
// Could put some check later on when needed
    if (!title || typeof title !== "string") {
      res.status(400).json({ message: "title is required" });
      return;   
    }

    if (!listId || typeof listId !== "string") {
      res.status(400).json({ message: "listId is required" });
      return;
    }

    const task = await taskService.createTask({ title, listId, description, stack, assigneeId });

    res.status(201).json({ task });
  } catch (error) {
    if (error instanceof Error && error.message === "List not found!") {
      res.status(404).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getTaskDetail(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params;

    if (typeof taskId !== "string") {
      res.status(400).json({ message: "Invalid taskId" });
      return;
    }

    const task = await taskService.getTaskDetail(taskId);

    res.status(200).json({ task });
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found!") {
      res.status(404).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params;
    const { title, description, stack, assigneeId } = req.body;

    if (typeof taskId !== "string") {
      res.status(400).json({ message: "Invalid taskId" });
      return;
    }

    const task = await taskService.updateTask({ taskId, title, description, stack, assigneeId });

    res.status(200).json({ task });
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found!") {
      res.status(404).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function moveTask(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params;
    const { newListId, newPosition } = req.body;

    if (typeof taskId !== "string") {
      res.status(400).json({ message: "Invalid taskId" });
      return;
    }

    if (!newListId || typeof newListId !== "string") {
      res.status(400).json({ message: "newListId is required" });
      return;
    }

    if (typeof newPosition !== "number") {
      res.status(400).json({ message: "newPosition is required and must be a number" });
      return;
    }

    const task = await taskService.moveTask({ taskId, newListId, newPosition });

    res.status(200).json({ task });
  } catch (error) {
    if (error instanceof Error && error.message === "List not found") {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error instanceof Error && error.message === "Cannot move a task to a list in different project") {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params;

    if (typeof taskId !== "string") {
      res.status(400).json({ message: "Invalid taskId" });
      return;
    }

    const deleted = await taskService.deleteTask(taskId);

    res.status(200).json({ deleted });
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found!") {
      res.status(404).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

