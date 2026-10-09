import { Router } from "express";
import authRoutes from "./auth.routes";
import { projectRoutes } from "./project.routes";
import { projectMemberRoutes } from "./project-member.routes";
import { flatTaskRoutes } from "./taskRoutes";
import commitRoutes from "./commit.routes";
import messageRoutes from "./message.routes";
import { requireAuth } from "../middleware/auth.middleware";

const indexRouter = Router();

indexRouter.use("/auth", authRoutes);
indexRouter.use("/projects", projectRoutes);
indexRouter.use("/project", projectRoutes);
indexRouter.use("/project/member", projectMemberRoutes);
indexRouter.use("/invites", projectMemberRoutes);
indexRouter.use("/tasks", requireAuth, flatTaskRoutes);
indexRouter.use("/commits", commitRoutes);
indexRouter.use("/", requireAuth, messageRoutes);

export default indexRouter;