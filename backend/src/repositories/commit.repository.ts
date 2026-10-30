import { MembershipStatus } from "@prisma/client";
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

  // This endpoint is unauthenticated (the desktop app has no session), so never
  // create users or projects from it: the author must be an active member.
  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: authorId, projectId } },
    select: { status: true },
  });
  if (!membership || membership.status !== MembershipStatus.ACTIVE) {
    throw new Error("AUTHOR_NOT_PROJECT_MEMBER");
  }

  return prisma.$transaction(async (tx) => {
    const commit = await tx.commit.upsert({
      where: { id: sha },
      update: { message },
      create: { id: sha, message, projectId, authorId },
    });

    if (commit.projectId !== projectId) {
      throw new Error("COMMIT_IN_OTHER_PROJECT");
    }

    // taskIds is the complete set of tasks for this commit: link those (only
    // within this project) and unlink any task that was dropped
    if (Array.isArray(taskIds)) {
      await tx.task.updateMany({
        where: { commitId: commit.id, id: { notIn: taskIds } },
        data: { commitId: null },
      });
      if (taskIds.length > 0) {
        await tx.task.updateMany({
          where: { id: { in: taskIds }, projectId },
          data: { commitId: commit.id },
        });
      }
    }

    const linkedTasks = await tx.task.findMany({
      where: { commitId: commit.id },
      select: { id: true, title: true },
    });

    return {
      id: commit.id,
      message: commit.message,
      projectId: commit.projectId,
      authorId: commit.authorId,
      createdAt: commit.createdAt,
      tasks: linkedTasks,
    };
  });
}

export const commitRepository = { getCommitsByProjectId, upsertCommit };
