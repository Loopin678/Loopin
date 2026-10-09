import { Router } from "express";
import * as messageController from "../controllers/message.controller";

const router = Router();

router.get("/projects/:projectId/messages", messageController.getMessages);

export default router;