import { Router } from "express";
import { getListsByProject, createList, renameList, deleteList } from "../controllers/listController";

const router = Router({ mergeParams: true });

router.get("/", getListsByProject);
router.post("/", createList);
router.patch("/:listId", renameList);
router.delete("/:listId", deleteList); // To Do and Done are protected; tasks move to To Do

export default router;