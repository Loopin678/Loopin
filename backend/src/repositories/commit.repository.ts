import { prisma } from "../library/prisma";
import { CommitInput } from "../types/commit";

async function getCommitsByProjectId(projectId: string) {
  const commits = await prisma.commit.findMany({
    where: { projectId },
    include: {
      Task: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return commits.map((c) => ({
    id: c.id,
    message: c.message,
    projectId: c.projectId,
    authorId: c.authorId,
    createdAt: c.createdAt,
    tasks: c.Task,
  }));
}

async function upsertCommit(data: CommitInput) {
  const { sha, message, projectId, authorId, taskIds } = data;

  // Ensure author exists in DB (or create fallback user if not found)
  let user = await prisma.user.findUnique({ where: { id: authorId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: authorId,
        name: "Desktop User",
        email: `${authorId}@loopin.local`,
      },
    });
  }

  // Ensure project exists in DB (or create fallback project if not found)
  let project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        id: projectId,
        name: "Default Project",
      },
    });
  }

  const commit = await prisma.commit.upsert({
    where: { id: sha },
    update: {
      message,
      projectId,
      authorId: user.id,
    },
    create: {
      id: sha,
      message,
      projectId,
      authorId: user.id,
    },
  });

  if (Array.isArray(taskIds) && taskIds.length > 0) {
    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: { commitId: commit.id },
    });
  }

  const updatedTasks = await prisma.task.findMany({
    where: { commitId: commit.id },
    select: { id: true, title: true },
  });

  return {
    id: commit.id,
    message: commit.message,
    projectId: commit.projectId,
    authorId: commit.authorId,
    createdAt: commit.createdAt,
    tasks: updatedTasks,
  };
}

export const commitRepository = { getCommitsByProjectId, upsertCommit };
