import * as messageRepo from "../repositories/message.repository";

function extractMentions(text: string): string[] {
  return [...text.matchAll(/@(\w+)/g)].map((m) => m[1]);
}

export async function sendMessage(projectId: string, senderId: string, content: string) {
  const mentionedNames = extractMentions(content);
  const isAiMentioned = mentionedNames.some((n) => n.toLowerCase() === "ai");

  const message = await messageRepo.createMessage(projectId, senderId, content);

  const realNames = mentionedNames.filter((n) => n.toLowerCase() !== "ai");
  if (realNames.length > 0) {
    const users = await messageRepo.findUsersByNames(realNames);
    await messageRepo.createMentions(message.id, users.map((u) => u.id));
  }

  const aiUser = await messageRepo.findAiUser();
  if (isAiMentioned && aiUser) {
    await messageRepo.createAiMention(message.id, aiUser.id);
  }

  return { message, isAiMentioned, aiUser };
}

export async function generateAiReply(projectId: string, aiUserId: string) {
  // TODO: replace placeholder with real aiHelper.ts call once it exists
  const placeholderReply = "AI chat integration coming soon — this message was tagged for AI review.";
  return messageRepo.createMessage(projectId, aiUserId, placeholderReply);
}

export function getProjectMessages(projectId: string) {
  return messageRepo.getMessagesByProject(projectId);
}