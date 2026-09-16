import { Router } from "express";
import { getListsByProject, createList, renameList } from "../controllers/listController";

const router = Router({ mergeParams: true });

router.get("/", getListsByProject);
router.post("/", createList);
router.patch("/:listId", renameList);

export default router;