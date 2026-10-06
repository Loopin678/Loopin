import { Router } from "express";
import { reportCommit, groupCommits } from "../controllers/commit.controller";

const commitRouter = Router();

commitRouter.post("/", reportCommit);
commitRouter.post("/group", groupCommits);

export default commitRouter;
