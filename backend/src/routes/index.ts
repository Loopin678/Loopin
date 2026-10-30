import { Router } from "express";
import authRoutes from "./auth.routes";
import { projectRoutes } from "./project.routes";
import { projectMemberRoutes } from "./project-member.routes";
import { flatTaskRoutes } from "./taskRoutes";
import commitRoutes from "./commit.routes";
import messageRoutes from "./message.routes";
import { requireAuth } from "../middleware/auth.middleware";
import { profileRoutes } from "./profile.routes";

const indexRouter = Router();

indexRouter.use("/auth", authRoutes);
indexRouter.use("/projects", projectRoutes);
// /project/member must be mounted before the /project alias, or projectRoutes'
// /:projectId/* handlers would capture "member" as a projectId
indexRouter.use("/project/member", projectMemberRoutes);
indexRouter.use("/project", projectRoutes);
indexRouter.use("/tasks", requireAuth, flatTaskRoutes);
indexRouter.use("/commits", requireAuth, commitRoutes);
indexRouter.use("/users", profileRoutes);
indexRouter.use("/", requireAuth, messageRoutes);

export default indexRouter;