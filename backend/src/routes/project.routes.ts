import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {createProject,getProjectById,getProjectsByUserId,updateProject,deleteProject,} 
from "../controllers/project.controller";

import listRoutes from './listRoutes'
import { nestedTaskRoutes } from './taskRoutes'

const projectRoutes = Router();

projectRoutes.use(requireAuth);

projectRoutes.post("/", createProject);

projectRoutes.get("/user/:userId", getProjectsByUserId);

projectRoutes.get("/:projectId", getProjectById);
projectRoutes.patch("/:projectId", updateProject);

projectRoutes.delete("/:projectId", deleteProject);

projectRoutes.use("/:projectId/lists", listRoutes);
projectRoutes.use("/:projectId/tasks", nestedTaskRoutes);

export {projectRoutes};