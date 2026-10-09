import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";

import {
  addProjectMember,
  getProjectMember,
  getProjectMembers,
  getProjectMembershipsByUserId,
  removeProjectMember,
  sendProjectInvite,
  getProjectInvites,
  cancelProjectInvite,
  getMyInvites,
  acceptInvite,
  declineInvite,
} from "../controllers/project-member.controller";

const projectMemberRoutes = Router();

// User's own invites (must come before /:projectId so "invites" isn't treated as projectId)
projectMemberRoutes.get("/invites/my", requireAuth, getMyInvites);
projectMemberRoutes.post("/invites/:inviteId/accept", requireAuth, acceptInvite);
projectMemberRoutes.post("/invites/:inviteId/decline", requireAuth, declineInvite);

projectMemberRoutes.get("/user/:userId", getProjectMembershipsByUserId);

// Project member management
projectMemberRoutes.post("/:projectId", requireAuth, addProjectMember);
projectMemberRoutes.get("/:projectId/:userId", getProjectMember);
projectMemberRoutes.get("/:projectId", getProjectMembers);
projectMemberRoutes.delete("/:projectId/:userId", requireAuth, removeProjectMember);

// Project invite management
projectMemberRoutes.post("/:projectId/invites", requireAuth, sendProjectInvite);
projectMemberRoutes.get("/:projectId/invites", requireAuth, getProjectInvites);
projectMemberRoutes.delete("/:projectId/invites/:inviteId", requireAuth, cancelProjectInvite);

export { projectMemberRoutes };