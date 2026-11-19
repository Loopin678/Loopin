
import { prisma } from "../library/prisma";

export async function createProjectRepository(data: {
    projectId: string;
    userId: string;
    githubRepoId: string;
    name: string;
    fullName: string;
    url: string;
    description?: string | null;
    language?: string | null;
    isPrivate: boolean;
    stars: number;
    forks: number;
    githubUpdatedAt?: Date | null;
}) {
    return await prisma.projectRepository.create({
        data,
    });
}

export async function findProjectRepositories(projectId: string) {
    return await prisma.projectRepository.findMany({
        where: { projectId },
        orderBy: { syncedAt: "desc" },
    });
}

export async function findProjectRepository(
    projectId: string,
    githubRepoId: string
) {
    return await prisma.projectRepository.findUnique({
        where: {
            projectId_githubRepoId: {
                projectId,
                githubRepoId,
            },
        },
    });
}

export async function deleteProjectRepository(
    projectId: string,
    githubRepoId: string
) {
    return await prisma.projectRepository.delete({
        where: {
            projectId_githubRepoId: {
                projectId,
                githubRepoId,
            },
        },
    });
}

export async function updateProjectRepositorySync(
    projectId: string,
    githubRepoId: string,
    data: {
        name: string;
        fullName: string;
        url: string;
        description?: string | null;
        language?: string | null;
        isPrivate: boolean;
        stars: number;
        forks: number;
        githubUpdatedAt?: Date | null;
    }
) {
    return await prisma.projectRepository.update({
        where: {
            projectId_githubRepoId: {
                projectId,
                githubRepoId,
            },
        },
        data: {
            ...data,
            syncedAt: new Date(),
        },
    });
}

export async function findProjectMembership(
    projectId: string,
    userId: string
) {
    return await prisma.projectMember.findUnique({
        where: {
            userId_projectId: {
                userId,
                projectId,
            },
        },
        select: {
            role: true,
            status: true,
        },
    });
}

export async function findUserProjectRepository(
    projectId: string,
    userId: string,
    githubRepoId: string
) {
    return await prisma.projectRepository.findFirst({
        where: {
            projectId,
            userId,
            githubRepoId,
        },
    });
}
