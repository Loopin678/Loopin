import { prisma } from "../library/prisma";
import { MemberRole, MembershipStatus } from "@prisma/client";

export async function createProjectMember(data: {
  userId: string;
  projectId: string;
  stack: string;
  role?: MemberRole;
  status?: MembershipStatus;
}) {
  const member = await prisma.projectMember.create({
    data: {
      userId: data.userId,
      projectId: data.projectId,
      stack: data.stack,
      role: data.role ?? MemberRole.MEMBER,
      status: data.status ?? MembershipStatus.ACTIVE,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return member;
}

export async function updateProjectMemberStatus(
  id: string,
  status: MembershipStatus
) {
  return prisma.projectMember.update({
    where: { id },
    data: { status },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function findProjectMember(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return member;
}

export async function findProjectMembershipsByUserId(userId: string) {
  const memberships = await prisma.projectMember.findMany({
    where: {
      userId,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  return memberships;
}

export async function findProjectMembers(projectId: string) {
  const members = await prisma.projectMember.findMany({
    where: {
      projectId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  return members;
}

export async function deleteProjectMember(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });

  if (!member) {
    return false;
  }

  await prisma.projectMember.delete({
    where: {
      id: member.id,
    },
  });
  return true;
}

/* =========================================================================
   PROJECT INVITES REPOSITORY METHODS
   ========================================================================= */

export async function createProjectInvite(data: {
  projectId: string;
  email: string;
  stack?: string;
  role?: string;
  invitedById: string;
}) {
  const invite = await prisma.projectInvite.create({
    data: {
      projectId: data.projectId,
      email: data.email.toLowerCase().trim(),
      stack: data.stack?.trim() || "fullstack",
      role: data.role || "MEMBER",
      invitedById: data.invitedById,
      status: "pending",
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return invite;
}

export async function findProjectInvites(projectId: string) {
  return prisma.projectInvite.findMany({
    where: {
      projectId,
      status: "pending",
    },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function findPendingInvitesByEmail(email: string) {
  return prisma.projectInvite.findMany({
    where: {
      email: email.toLowerCase().trim(),
      status: "pending",
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function findInviteById(inviteId: string) {
  return prisma.projectInvite.findUnique({
    where: {
      id: inviteId,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function updateInviteStatus(inviteId: string, status: string) {
  return prisma.projectInvite.update({
    where: { id: inviteId },
    data: { status },
  });
}

export async function deleteProjectInvite(inviteId: string) {
  return prisma.projectInvite.delete({
    where: { id: inviteId },
  });
}