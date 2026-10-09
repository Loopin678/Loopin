import { prisma } from "../library/prisma";

const AI_USER_EMAIL = "ai@loopin.system";

export function createMessage(projectId: string, senderId: string, content: string) {
  return prisma.message.create({
    data: { projectId, senderId, content },
    include: { sender: true },
  });
}

export function getMessagesByProject(projectId: string) {
  return prisma.message.findMany({
    where: { projectId },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

export function findUsersByNames(names: string[]) {
  return prisma.user.findMany({ where: { name: { in: names } } });
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