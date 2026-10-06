import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  createProject,
  getProjectById,
  getProjectsByUserId,
  updateProject,
  deleteProject,
} from "../controllers/project.controller";
import { getProjectCommits } from "../controllers/commit.controller";

import listRoutes from "./listRoutes";
import { nestedTaskRoutes } from "./taskRoutes";

const projectRoutes = Router();

// Endpoints accessible by project context (desktop app & readers)
projectRoutes.use("/:projectId/tasks", nestedTaskRoutes);
projectRoutes.use("/:projectId/lists", listRoutes);
projectRoutes.get("/:projectId/commits", getProjectCommits);

// Protected endpoints requiring authenticated user session
projectRoutes.post("/", requireAuth, createProject);
projectRoutes.get("/user/:userId", requireAuth, getProjectsByUserId);
projectRoutes.get("/:projectId", requireAuth, getProjectById);
projectRoutes.patch("/:projectId", requireAuth, updateProject);
projectRoutes.delete("/:projectId", requireAuth, deleteProject);

export { projectRoutes };