import { prisma } from "../library/prisma";

const AI_USER_EMAIL = "ai@loopin.system";

// The only user fields allowed to leave the server inside a message.
// Never use `include: { sender: true }`: that sends the password hash too.
const publicSender = { select: { id: true, name: true, username: true } } as const;

export function createMessage(projectId: string, senderId: string, content: string) {
  return prisma.message.create({
    data: { projectId, senderId, content },
    include: { sender: publicSender },
  });
}

export async function getMessagesByProject(projectId: string) {
  // Newest 100, flipped back to oldest-first for display
  const messages = await prisma.message.findMany({
    where: { projectId },
    include: { sender: publicSender },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return messages.reverse();
}

export async function findUsersByUsernames(usernames: string[], projectId: string) {
  // Only ACTIVE members of this project can be mentioned
  const members = await prisma.projectMember.findMany({
    where: {
      projectId,
      status: "ACTIVE",
      user: { username: { in: usernames } },
    },
    select: { user: { select: { id: true, username: true } } },
  });

  return members.map((m) => m.user);
}

export function createMentions(messageId: string, userIds: string[]) {
  if (userIds.length === 0) return Promise.resolve();
  return prisma.mention.createMany({
    data: userIds.map((userId) => ({ messageId, userId })),
  });
}

export function createAiMention(messageId: string, aiUserId: string) {
  return prisma.mention.create({
    data: { messageId, userId: aiUserId, isAiMention: true },
  });
}

export function findAiUser() {
  return prisma.user.findUnique({ where: { email: AI_USER_EMAIL } });
}