import { Router } from "express";
import authRoutes from "./auth.routes";
import { projectRoutes } from "./project.routes"

const indexRouter = Router();

indexRouter.use("/auth", authRoutes);
indexRouter.use("/project", projectRoutes);

export default indexRouter;

/*
    gonna setup all routes behind the /api endpoint 
    make /api look like a complete tree
*/