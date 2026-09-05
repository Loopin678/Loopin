import { Router } from "express";
import { getListsByProject, createList, renameList } from "../controllers/listController";

const router = Router();

router.get("/projects/:projectId/lists", getListsByProject);
router.post("/projects/:projectId/lists", createList);
router.patch("/projects/:projectId/lists/:listId", renameList);

export default router;