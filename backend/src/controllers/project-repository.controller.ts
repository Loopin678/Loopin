
import { Request, Response } from "express";

import {
    getProjectRepositories,
    linkGitHubRepository,
    unlinkGitHubRepository,
} from "../services/project-repository.service";
import {
    getAvailableGitHubRepositories,
    refreshProjectRepositories,
} from "../services/project-repository.service";

function getStringParam(param: string | string[] | undefined): string | null {
    if (typeof param !== "string" || !param.trim()) {
        return null;
    }

    return param;
}

export async function getProjectRepositoriesController(
    req: Request,
    res: Response
) {
    try {
        const userId = req.user?.id;
        const projectId = getStringParam(req.params.projectId);

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!projectId) {
            res.status(400).json({ message: "Invalid project ID" });
            return;
        }

        const repositories = await getProjectRepositories(
            projectId,
            userId
        );

        res.status(200).json({
            count: repositories.length,
            repositories,
        });
    } catch (error) {
        handleProjectRepositoryError(error, res);
    }
}

export async function linkGitHubRepositoryController(
    req: Request,
    res: Response
) {
    try {
        const userId = req.user?.id;
     const projectId = getStringParam(req.params.projectId);
        const { githubRepoId } = req.body;

          if(!userId){
               res.status(401).json({ message: "Unauthorized" });
               return;
        }
          if(!projectId){
               res.status(400).json({ message: "Invalid project ID" });
               return;
          }
        if (
            typeof githubRepoId !== "string" ||
            !/^\d+$/.test(githubRepoId)
        ) {
            res.status(400).json({
                message: "A valid GitHub repository ID is required",
            });
            return;
        }

        const repository = await linkGitHubRepository(
            projectId,
            userId,
            githubRepoId
        );

        res.status(201).json({
            message: "GitHub repository linked successfully",
            repository,
        });
    } catch (error) {
        handleProjectRepositoryError(error, res);
    }
}


export async function unlinkGitHubRepositoryController(
    req: Request,
    res: Response
) {
    try {
        const userId = req.user?.id;
        const projectId = getStringParam(req.params.projectId);
        const githubRepoId = getStringParam(req.params.githubRepoId);

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!projectId || !githubRepoId) {
            res.status(400).json({
                message: "Invalid project ID or GitHub repository ID",
            });
            return;
        }

        const repository = await unlinkGitHubRepository(
            projectId,
            userId,
            githubRepoId
        );

        res.status(200).json({
            message: "GitHub repository unlinked successfully",
            repository,
        });
    } catch (error) {
        handleProjectRepositoryError(error, res);
    }
}


function handleProjectRepositoryError(error: unknown, res: Response) {
    const message = error instanceof Error ? error.message : "";

    const errors: Record<string, { status: number; message: string }> = {
        PROJECT_ACCESS_DENIED: {
            status: 403,
            message: "You are not an active member of this project",
        },
        PROJECT_OWNER_REQUIRED: {
            status: 403,
            message: "Only the project owner can manage linked repositories",
        },
        USER_NOT_FOUND: {
            status: 404,
            message: "User not found",
        },
        GITHUB_REPOSITORY_FETCH_DISABLED: {
            status: 403,
            message: "GitHub repository fetching is disabled",
        },
        GITHUB_ACCOUNT_NOT_CONNECTED: {
            status: 400,
            message: "GitHub account is not connected",
        },
        REPOSITORY_ALREADY_LINKED: {
            status: 409,
            message: "Repository is already linked to this project",
        },
        GITHUB_REPOSITORY_NOT_FOUND: {
            status: 404,
            message: "GitHub repository not found in your accessible repositories",
        },
        PROJECT_REPOSITORY_NOT_FOUND: {
            status: 404,
            message: "Linked repository not found",
        },
        GITHUB_TOKEN_INVALID: {
            status: 401,
            message: "GitHub authorization has expired or is invalid",
        },
        GITHUB_API_FORBIDDEN: {
            status: 403,
            message: "GitHub API access forbidden",
        },
    };

    const knownError = errors[message];

    if (knownError) {
        res.status(knownError.status).json({
            message: knownError.message,
        });
        return;
    }

    if (message.startsWith("GITHUB_RATE_LIMIT_EXCEEDED:")) {
        res.status(429).json({
            message: "GitHub API rate limit exceeded",
            retryAfter: message.split(":")[1],
        });
        return;
    }

    console.error("Project repository error:", error);

    res.status(500).json({
        message: "Internal server error",
    });
}


export async function getAvailableGitHubRepositoriesController(
    req: Request,
    res: Response
) {
    try {
        const userId = req.user?.id;
        const projectId = getStringParam(req.params.projectId);

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!projectId) {
            res.status(400).json({ message: "Invalid project ID" });
            return;
        }

        const repositories = await getAvailableGitHubRepositories(
            projectId,
            userId
        );

        res.status(200).json({
            count: repositories.length,
            repositories,
        });
    } catch (error) {
        handleProjectRepositoryError(error, res);
    }
}
export async function refreshProjectRepositoriesController(
    req: Request,
    res: Response
) {
    try {
        const userId = req.user?.id;
        const projectId = getStringParam(req.params.projectId);

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!projectId) {
            res.status(400).json({ message: "Invalid project ID" });
            return;
        }

        const result = await refreshProjectRepositories(
            projectId,
            userId
        );

        res.status(200).json({
            message: "Repository synchronization completed",
            ...result,
        });
    } catch (error) {
        handleProjectRepositoryError(error, res);
    }
}
