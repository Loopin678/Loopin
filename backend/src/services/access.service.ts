import { MemberRole, MembershipStatus } from "@prisma/client";
import { findProjectMember } from "../repositories/project-member.repository";

// Throws unless the user is an ACTIVE member of the project.
export async function assertActiveMember(projectId: string, userId: string) {
  const member = await findProjectMember(projectId, userId);

  if (!member || member.status !== MembershipStatus.ACTIVE) {
    throw new Error("FORBIDDEN_NOT_PROJECT_MEMBER");
  }

  return member;
}

// Throws unless the user is the ACTIVE owner of the project.
export async function assertProjectOwner(projectId: string, userId: string) {
  const member = await assertActiveMember(projectId, userId);

  if (member.role !== MemberRole.OWNER) {
    throw new Error("FORBIDDEN_NOT_PROJECT_OWNER");
  }

  return member;
}

// Throws unless the assignee is an ACTIVE member of the same project.
export async function assertValidAssignee(projectId: string, assigneeId: string) {
  const member = await findProjectMember(projectId, assigneeId);

  if (!member || member.status !== MembershipStatus.ACTIVE) {
    throw new Error("ASSIGNEE_NOT_PROJECT_MEMBER");
  }
}