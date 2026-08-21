import { Router } from "express";
import authRoutes from "./auth.routes";

const indexRouter = Router();

indexRouter.use("/auth", authRoutes);

export default indexRouter;

/*
    gonna setup all routes behind the /api endpoint 
    make /api look like a complete tree
*/