
import { Router } from "express";

import {
    getProjectRepositoriesController,
    linkGitHubRepositoryController,
    unlinkGitHubRepositoryController,
} from "../controllers/project-repository.controller";

import {
    getAvailableGitHubRepositoriesController,
    refreshProjectRepositoriesController,
} from "../controllers/project-repository.controller";

import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/:projectId/github-repositories/available",requireAuth,getAvailableGitHubRepositoriesController
);

router.post("/:projectId/repositories/refresh",requireAuth,refreshProjectRepositoriesController
);

router.get("/:projectId/repositories",requireAuth,getProjectRepositoriesController);

router.post("/:projectId/repositories",requireAuth,linkGitHubRepositoryController);

router.delete("/:projectId/repositories/:githubRepoId",requireAuth,unlinkGitHubRepositoryController);

export default router;
