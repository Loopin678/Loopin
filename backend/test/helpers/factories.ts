import bcrypt from "bcrypt";
import { ListKind, MemberRole, MembershipStatus } from "@prisma/client";
import { prisma } from "../../src/library/prisma";
import { createProjectWithOwner } from "../../src/repositories/project.repository";
import { generateToken } from "../../src/services/auth.service";

let seq = 0;
const next = () => ++seq;

export const PASSWORD = "correct-horse-battery";

export async function createUser(overrides: Partial<{ name: string; email: string; username: string; password: string }> = {}) {
  const n = next();
  return prisma.user.create({
    data: {
      name: overrides.name ?? `User ${n}`,
      email: overrides.email ?? `user${n}@example.test`,
      username: overrides.username ?? `user_${n}`,
      password: await bcrypt.hash(overrides.password ?? PASSWORD, 4),
    },
  });
}

// A project with its owner and the three starter lists, exactly as the API creates it
export async function createProject(ownerId: string, name = `Project ${next()}`) {
  const project = await createProjectWithOwner({ name, ownerId, stack: "fullstack" });
  const lists = await prisma.list.findMany({ where: { projectId: project.id }, orderBy: { position: "asc" } });
  const byKind = (k: ListKind) => lists.find((l) => l.kind === k)!;
  return { project, lists, todo: byKind(ListKind.TODO), inProgress: byKind(ListKind.IN_PROGRESS), done: byKind(ListKind.DONE) };
}

export async function addMember(
  projectId: string,
  userId: string,
  status: MembershipStatus = MembershipStatus.ACTIVE,
  role: MemberRole = MemberRole.MEMBER
) {
  return prisma.projectMember.create({ data: { projectId, userId, status, role, stack: "frontend" } });
}

export async function createTask(listId: string, projectId: string, overrides: Partial<{ title: string; position: number; assigneeId: string }> = {}) {
  const count = await prisma.task.count({ where: { listId } });
  return prisma.task.create({
    data: {
      title: overrides.title ?? `Task ${next()}`,
      position: overrides.position ?? count,
      listId,
      projectId,
      assigneeId: overrides.assigneeId,
    },
  });
}

// Request headers for a logged-in user, as the website sends them (cookie)
export function as(user: { id: string }) {
  return { Cookie: `auth_token=${generateToken(user.id)}` };
}
