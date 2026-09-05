import { Router } from "express";
import { createTask, getTaskDetail, updateTask, deleteTask, moveTask } from "../controllers/taskController";

const router = Router();

router.post("/projects/:projectId/tasks", createTask);
router.get("/tasks/:taskId", getTaskDetail);
router.patch("/tasks/:taskId", updateTask);
router.patch("/tasks/:taskId/move", moveTask);
router.delete("/tasks/:taskId", deleteTask);

export default router;
