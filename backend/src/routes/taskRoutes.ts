import { Router } from "express";
import { createTask, getTaskDetail, updateTask, deleteTask, moveTask, getTasksByProject } from "../controllers/taskController";

const nestedTaskRoutes = Router({ mergeParams: true });
nestedTaskRoutes.get("/", getTasksByProject);
nestedTaskRoutes.post("/", createTask);

const flatTaskRoutes = Router();
flatTaskRoutes.get("/:taskId", getTaskDetail);
flatTaskRoutes.patch("/:taskId", updateTask);
flatTaskRoutes.patch("/:taskId/move", moveTask);
flatTaskRoutes.delete("/:taskId", deleteTask);

export {nestedTaskRoutes, flatTaskRoutes};
