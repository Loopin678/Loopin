import { Prisma, MembershipStatus } from "@prisma/client";
import { prisma } from "../library/prisma";

const ownProfileSelect = {
  id: true,
  name: true,
  username: true,
  bio: true,
  skills: true,
  email: true,
  createdAt: true,
  // Selected only to work out the two booleans below, and removed before anything is returned
  password: true,
  googleId: true,
} satisfies Prisma.UserSelect;

type OwnProfileRow = Prisma.UserGetPayload<{ select: typeof ownProfileSelect }>;

// The password hash and Google id never leave this file: only yes/no flags do
function toOwnProfile(user: OwnProfileRow) {
  const { password, googleId, ...rest } = user;
  return { ...rest, hasPassword: password !== null, googleLinked: googleId !== null };
}

export async function findOwnProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: ownProfileSelect,
  });

  return user ? toOwnProfile(user) : null;
}

export async function updateProfile(
  userId: string,
  data: { name?: string; username?: string; bio?: string | null; skills?: string[] }
) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: ownProfileSelect,
    });
    return toOwnProfile(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // username is the only unique field we ever update here
      if (error.code === "P2002") throw new Error("USERNAME_TAKEN");
      if (error.code === "P2025") throw new Error("User not found");
    }
    throw error;
  }
}

// What teammates may see. Returns null unless viewer and target are the same person
// or share at least one ACTIVE project. No email, ever.
export async function findPublicProfile(viewerId: string, targetId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: targetId,
      OR: [
        { id: viewerId },
        {
          memberships: {
            some: {
              status: MembershipStatus.ACTIVE,
              project: {
                members: { some: { userId: viewerId, status: MembershipStatus.ACTIVE } },
              },
            },
          },
        },
      ],
    },
    select: { id: true, name: true, username: true, bio: true, skills: true },
  });

  if (!user) return null;

  // Projects they have in common, with the person's role and stack in each
  const shared = await prisma.projectMember.findMany({
    where: {
      userId: targetId,
      status: MembershipStatus.ACTIVE,
      project: {
        members: { some: { userId: viewerId, status: MembershipStatus.ACTIVE } },
      },
    },
    select: { role: true, stack: true, project: { select: { id: true, name: true } } },
    orderBy: { project: { name: "asc" } },
  });

  return {
    ...user,
    sharedProjects: shared.map((m) => ({
      projectId: m.project.id,
      projectName: m.project.name,
      role: m.role,
      stack: m.stack,
    })),
  };
}