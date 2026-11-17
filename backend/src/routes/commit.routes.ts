import { Router } from "express";
import rateLimit from "express-rate-limit";
import { reportCommit, groupCommits, suggestTasksForCommit, completeTasksFromCommit } from "../controllers/commit.controller";

const commitRouter = Router();

// suggest-tasks may call the Claude API (paid) and these routes have no session,
// so they get a tighter per-IP limit than the general API limiter
const suggestionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many commit analyses, please slow down" },
});

commitRouter.post("/", reportCommit);
commitRouter.post("/group", groupCommits);
commitRouter.post("/suggest-tasks", suggestionLimiter, suggestTasksForCommit);
commitRouter.post("/:sha/complete-tasks", suggestionLimiter, completeTasksFromCommit);

export default commitRouter;
