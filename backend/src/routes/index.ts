import { Router } from "express";
import authRoutes from "./auth.routes";
import messageRoutes from "./message.routes";      // ADDED

const indexRouter = Router();

// indexRouter.use("/auth", authRoutes);
indexRouter.use(messageRoutes);                      // ADDED

export default indexRouter;

/*
    gonna setup all routes behind the /api endpoint 
    make /api look like a complete tree
*/