import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  addProjectMember,
  getProjectMember,
  getProjectMembers,
  getProjectMembershipsByUserId,
  removeProjectMember,
  getPendingProjectInvitations,
  acceptProjectInvitation,
  declineProjectInvitation,
} from "../controllers/project-member.controller";

const projectMemberRoutes = Router();

projectMemberRoutes.use(requireAuth);

projectMemberRoutes.get("/invites", getPendingProjectInvitations)

projectMemberRoutes.post("/:projectId/accept", acceptProjectInvitation);

projectMemberRoutes.post("/:projectId/decline", declineProjectInvitation);

projectMemberRoutes.get("/user/:userId",getProjectMembershipsByUserId);

projectMemberRoutes.post("/:projectId",addProjectMember);

projectMemberRoutes.get("/:projectId/:userId",getProjectMember);

projectMemberRoutes.get("/:projectId",getProjectMembers)

projectMemberRoutes.delete("/:projectId/:userId",removeProjectMember);

export { projectMemberRoutes };