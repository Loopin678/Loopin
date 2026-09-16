import { Router } from "express";
import authRoutes from "./auth.routes";
import { projectRoutes } from "./project.routes";
import { projectMemberRoutes } from "./project-member.routes";
import { flatTaskRoutes } from "./taskRoutes";
import { requireAuth } from "../middleware/auth.middleware";

const indexRouter = Router();

indexRouter.use("/auth", authRoutes);
indexRouter.use("/projects", projectRoutes);
indexRouter.use("/project/member", projectMemberRoutes);
indexRouter.use("/tasks", requireAuth, flatTaskRoutes);

export default indexRouter;

/*
    gonna setup all routes behind the /api endpoint
    make /api look like a complete tree
*/