import { Router } from "express";
import authRoutes from "./auth.routes";
import { projectRoutes } from "./project.routes"
import { projectMemberRoutes } from "./project-member.routes";

const indexRouter = Router();

indexRouter.use("/auth", authRoutes);
indexRouter.use("/project", projectRoutes);
indexRouter.use("/project/member", projectMemberRoutes);


export default indexRouter;

/*
    gonna setup all routes behind the /api endpoint 
    make /api look like a complete tree
*/