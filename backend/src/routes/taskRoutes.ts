import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { createTask, getTaskDetail, updateTask, deleteTask, moveTask, getTasksByProject, getMyTasks } from "../controllers/taskController";

const nestedTaskRoutes = Router({ mergeParams: true });
nestedTaskRoutes.get("/", requireAuth, getTasksByProject);
nestedTaskRoutes.post("/", requireAuth, createTask);

const flatTaskRoutes = Router();
// Must come BEFORE "/:taskId": Express matches routes in the order they're
// registered, so otherwise "mine" would be read as a task id and return 404
flatTaskRoutes.get("/mine", getMyTasks);
flatTaskRoutes.get("/:taskId", getTaskDetail);
flatTaskRoutes.patch("/:taskId", updateTask);
flatTaskRoutes.patch("/:taskId/move", moveTask);
flatTaskRoutes.delete("/:taskId", deleteTask);

export {nestedTaskRoutes, flatTaskRoutes};
