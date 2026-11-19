
import { findUserById } from "../repositories/user.repository";

import {
    createProjectRepository,
    findProjectRepositories,
    findProjectRepository,
    findProjectMembership,
    deleteProjectRepository,
    updateProjectRepositorySync
} from "../repositories/project-repository.repository";

import { decryptGitHubToken } from "../library/github-token";
import { fetchGitHubRepositories } from "./github.service";

async function verifyProjectMembership(projectId: string, userId: string) {
    const membership = await findProjectMembership(projectId, userId);

    if (!membership || membership.status !== "ACTIVE") {
        throw new Error("PROJECT_ACCESS_DENIED");
    }

    return membership;
}

async function verifyProjectOwner(projectId: string, userId: string) {
    const membership = await verifyProjectMembership(projectId, userId);

    if (membership.role !== "OWNER") {
        throw new Error("PROJECT_OWNER_REQUIRED");
    }
}

export async function getProjectRepositories(
    projectId: string,
    userId: string
) {
    await verifyProjectMembership(projectId, userId);

    return await findProjectRepositories(projectId);
}

export async function linkGitHubRepository(
    projectId: string,
    userId: string,
    githubRepoId: string
) {
    await verifyProjectOwner(projectId, userId);

    const user = await findUserById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    if (!user.fetchGithubRepositories) {
        throw new Error("GITHUB_REPOSITORY_FETCH_DISABLED");
    }

    if (!user.githubId || !user.githubAccessToken) {
        throw new Error("GITHUB_ACCOUNT_NOT_CONNECTED");
    }

    const existingRepository = await findProjectRepository(
        projectId,
        githubRepoId
    );

    if (existingRepository) {
        throw new Error("REPOSITORY_ALREADY_LINKED");
    }

    const accessToken = decryptGitHubToken(user.githubAccessToken);
    const repositories = await fetchGitHubRepositories(accessToken);

    const repository = repositories.find(
        (repo) => String(repo.id) === githubRepoId
    );

    if (!repository) {
        throw new Error("GITHUB_REPOSITORY_NOT_FOUND");
    }

    return await createProjectRepository({
        projectId,
        userId,
        githubRepoId,
        name: repository.name,
        fullName: repository.fullName,
        url: repository.url,
        description: repository.description,
        language: repository.language,
        isPrivate: repository.isPrivate,
        stars: repository.stars,
        forks: repository.forks,
        githubUpdatedAt: new Date(repository.updatedAt),
    });
}

export async function unlinkGitHubRepository(
    projectId: string,
    userId: string,
    githubRepoId: string
) {
    await verifyProjectOwner(projectId, userId);

    const repository = await findProjectRepository(
        projectId,
        githubRepoId
    );

    if (!repository) {
        throw new Error("PROJECT_REPOSITORY_NOT_FOUND");
    }

    return await deleteProjectRepository(projectId, githubRepoId);
}

export async function getAvailableGitHubRepositories(
    projectId: string,
    userId: string
) {
    await verifyProjectMembership(projectId, userId);

    const user = await findUserById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    if (!user.fetchGithubRepositories) {
        throw new Error("GITHUB_REPOSITORY_FETCH_DISABLED");
    }

    if (!user.githubId || !user.githubAccessToken) {
        throw new Error("GITHUB_ACCOUNT_NOT_CONNECTED");
    }

    const accessToken = decryptGitHubToken(user.githubAccessToken);

    return await fetchGitHubRepositories(accessToken);
}

export async function refreshProjectRepositories(
    projectId: string,
    userId: string
) {
    await verifyProjectOwner(projectId, userId);

    const user = await findUserById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    if (!user.fetchGithubRepositories) {
        throw new Error("GITHUB_REPOSITORY_FETCH_DISABLED");
    }

    if (!user.githubId || !user.githubAccessToken) {
        throw new Error("GITHUB_ACCOUNT_NOT_CONNECTED");
    }

    const accessToken = decryptGitHubToken(user.githubAccessToken);
    const githubRepositories = await fetchGitHubRepositories(accessToken);

    const linkedRepositories = await findProjectRepositories(projectId);

    let updated = 0;
    const unavailable: string[] = [];

    for (const linked of linkedRepositories) {
        const latest = githubRepositories.find(
            (repo) => String(repo.id) === linked.githubRepoId
        );

        if (!latest) {
            unavailable.push(linked.fullName);
            continue;
        }

        await updateProjectRepositorySync(
            projectId,
            linked.githubRepoId,
            {
                name: latest.name,
                fullName: latest.fullName,
                url: latest.url,
                description: latest.description,
                language: latest.language,
                isPrivate: latest.isPrivate,
                stars: latest.stars,
                forks: latest.forks,
                githubUpdatedAt: new Date(latest.updatedAt),
            }
        );

        updated++;
    }

    return {
        updated,
        unavailable,
    };
}
