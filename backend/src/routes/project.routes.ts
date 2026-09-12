import { Router } from "express";

import {createProject,getProjectById,getProjectsByUserId,updateProject,deleteProject,} 
from "../controllers/project.controller";

const projectRoutes = Router();

projectRoutes.post("/", createProject);

projectRoutes.get("/user/:userId", getProjectsByUserId);

projectRoutes.get("/:projectId", getProjectById);
projectRoutes.patch("/:projectId", updateProject);

projectRoutes.delete("/:projectId", deleteProject);

export {projectRoutes};