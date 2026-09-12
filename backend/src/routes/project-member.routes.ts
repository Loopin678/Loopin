import { Router } from "express";

import {
  addProjectMember,
  getProjectMember,
  getProjectMembers,
  getProjectMembershipsByUserId,
  removeProjectMember,
} from "../controllers/project-member.controller";

const projectMemberRoutes = Router();

projectMemberRoutes.get("/user/:userId",getProjectMembershipsByUserId);

projectMemberRoutes.post("/:projectId",addProjectMember);

projectMemberRoutes.get("/:projectId/:userId",getProjectMember);

projectMemberRoutes.get("/:projectId",getProjectMembers)

projectMemberRoutes.delete("/:projectId/:userId",removeProjectMember);

export { projectMemberRoutes };