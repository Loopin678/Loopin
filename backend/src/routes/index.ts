import { Router } from "express";
import authRoutes from "./auth.routes";
import { projectRoutes } from "./project.routes"
import { projectMemberRoutes } from "./project-member.routes";
import listRoutes from "./listRoutes";
import taskroutes from "./taskRoutes"

const indexRouter = Router()

indexRouter.use("/auth", authRoutes);
indexRouter.use("/project", projectRoutes);
indexRouter.use("/project/member", projectMemberRoutes);

indexRouter.use("/", listRoutes)
indexRouter.use("/",taskroutes)

export default indexRouter;