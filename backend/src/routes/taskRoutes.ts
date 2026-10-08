import { Router } from "express";
import { createTask, getTaskDetail, updateTask, deleteTask, moveTask } from "../controllers/taskController";

const nestedTaskRoutes = Router({ mergeParams: true });
nestedTaskRoutes.post("/", createTask);

const flatTaskRoutes = Router();
flatTaskRoutes.get("/:taskId", getTaskDetail);
flatTaskRoutes.patch("/:taskId", updateTask);
flatTaskRoutes.patch("/:taskId/move", moveTask);
flatTaskRoutes.delete("/:taskId", deleteTask);

export {nestedTaskRoutes, flatTaskRoutes};
