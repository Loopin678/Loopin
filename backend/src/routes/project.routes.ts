import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  createProject,
  getMyProjects,
  getProjectById,
  getProjectsByUserId,
  updateProject,
  deleteProject,
} from "../controllers/project.controller";
import { getProjectCommits } from "../controllers/commit.controller";
import {
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  getOutgoingProjectInvitations,
} from "../controllers/project-member.controller";

import listRoutes from "./listRoutes";
import { nestedTaskRoutes } from "./taskRoutes";

const projectRoutes = Router();

// Task listing and commits stay open for the desktop app, which has no session token;
// task creation (inside nestedTaskRoutes) and lists require auth
projectRoutes.use("/:projectId/tasks", nestedTaskRoutes);
projectRoutes.use("/:projectId/lists", requireAuth, listRoutes);
projectRoutes.get("/:projectId/commits", getProjectCommits);

// Project members & invites (aliases of /project/member/*; an invite is a PENDING member)
projectRoutes.get("/:projectId/members", requireAuth, getProjectMembers);
projectRoutes.post("/:projectId/members", requireAuth, addProjectMember);
projectRoutes.delete("/:projectId/members/:userId", requireAuth, removeProjectMember);
projectRoutes.get("/:projectId/invites", requireAuth, getOutgoingProjectInvitations);

// Protected endpoints requiring authenticated user session
projectRoutes.get("/", requireAuth, getMyProjects);
projectRoutes.post("/", requireAuth, createProject);
projectRoutes.get("/user/:userId", requireAuth, getProjectsByUserId);
projectRoutes.get("/:projectId", requireAuth, getProjectById);
projectRoutes.patch("/:projectId", requireAuth, updateProject);
projectRoutes.delete("/:projectId", requireAuth, deleteProject);

export { projectRoutes };