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
  getProjectInvites,
  sendProjectInvite,
  cancelProjectInvite,
} from "../controllers/project-member.controller";

import listRoutes from "./listRoutes";
import { nestedTaskRoutes } from "./taskRoutes";

const projectRoutes = Router();

// Endpoints accessible by project context (desktop app & readers)
projectRoutes.use("/:projectId/tasks", nestedTaskRoutes);
projectRoutes.use("/:projectId/lists", listRoutes);
projectRoutes.get("/:projectId/commits", getProjectCommits);

// Project members & invites
projectRoutes.get("/:projectId/members", getProjectMembers);
projectRoutes.post("/:projectId/members", requireAuth, addProjectMember);
projectRoutes.delete("/:projectId/members/:userId", requireAuth, removeProjectMember);
projectRoutes.get("/:projectId/invites", requireAuth, getProjectInvites);
projectRoutes.post("/:projectId/invites", requireAuth, sendProjectInvite);
projectRoutes.delete("/:projectId/invites/:inviteId", requireAuth, cancelProjectInvite);

// Protected endpoints requiring authenticated user session
projectRoutes.get("/", requireAuth, getMyProjects);
projectRoutes.post("/", requireAuth, createProject);
projectRoutes.get("/user/:userId", requireAuth, getProjectsByUserId);
projectRoutes.get("/:projectId", requireAuth, getProjectById);
projectRoutes.patch("/:projectId", requireAuth, updateProject);
projectRoutes.delete("/:projectId", requireAuth, deleteProject);

export { projectRoutes };