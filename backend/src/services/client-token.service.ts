import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../library/prisma";

// Tokens for the desktop app and CLI. Opaque, random, and only stored hashed,
// so a database leak doesn't leak working tokens.
export const CLIENT_TOKEN_PREFIX = "lpn_";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

// lastUsedAt is informational; don't write it on every request
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export async function issueClientToken(userId: string, name: string): Promise<string> {
  const token = CLIENT_TOKEN_PREFIX + randomBytes(32).toString("base64url");
  await prisma.clientToken.create({
    data: { userId, name: name.slice(0, 100), tokenHash: hash(token) },
  });
  return token;
}

export async function verifyClientToken(token: string): Promise<{ userId: string; tokenId: string } | null> {
  if (!token.startsWith(CLIENT_TOKEN_PREFIX)) return null;
  const row = await prisma.clientToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.revokedAt) return null;

  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.clientToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
  }
  return { userId: row.userId, tokenId: row.id };
}

export function listClientTokens(userId: string) {
  return prisma.clientToken.findMany({
    where: { userId, revokedAt: null },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "desc" },
  });
}

// Scoped to the owner, so nobody can revoke someone else's token by id
export async function revokeClientToken(userId: string, tokenId: string): Promise<boolean> {
  const result = await prisma.clientToken.updateMany({
    where: { id: tokenId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count === 1;
}
