import {
  createProjectMember,
  findProjectMember,
  findProjectMembers,
  findProjectMembershipsByUserId,
  deleteProjectMember,
  createProjectInvite,
  findProjectInvites,
  findPendingInvitesByEmail,
  findInviteById,
  updateInviteStatus,
  deleteProjectInvite,
  updateProjectMemberStatus,
} from "../repositories/project-member.repository";
import { findUserByEmail, findUserById } from "../repositories/user.repository";
import { MemberRole, MembershipStatus } from "@prisma/client";

export async function addProjectMemberService(data: {
  userId?: string;
  email?: string;
  projectId: string;
  stack?: string;
  role?: MemberRole;
}) {
  let targetUserId = data.userId;

  if (!targetUserId && data.email) {
    const user = await findUserByEmail(data.email.toLowerCase().trim());
    if (user) {
      targetUserId = user.id;
    } else {
      throw new Error("User with this email not found. Please send an invite instead.");
    }
  }

  if (!targetUserId) {
    throw new Error("userId or email is required");
  }

  const existingMember = await findProjectMember(data.projectId, targetUserId);

  if (existingMember) {
    if (existingMember.status === MembershipStatus.ACTIVE) {
      throw new Error("User is already an active member of this project");
    }
    // Activate existing pending membership
    return updateProjectMemberStatus(existingMember.id, MembershipStatus.ACTIVE);
  }

  const member = await createProjectMember({
    userId: targetUserId,
    projectId: data.projectId,
    stack: data.stack || "fullstack",
    role: data.role ?? MemberRole.MEMBER,
    status: MembershipStatus.ACTIVE,
  });

  return member;
}

export async function getProjectMemberService(projectId: string, userId: string) {
  const member = await findProjectMember(projectId, userId);

  if (!member) {
    throw new Error("Project member not found");
  }

  return member;
}

export async function getProjectMembersService(projectId: string) {
  const members = await findProjectMembers(projectId);
  return members;
}

export async function getProjectMembershipsByUserIdService(userId: string) {
  const memberships = await findProjectMembershipsByUserId(userId);
  return memberships;
}

export async function removeProjectMemberService(
  projectId: string,
  userId: string
) {
  const removed = await deleteProjectMember(projectId, userId);

  if (!removed) {
    throw new Error("Project member not found");
  }
}

/* =========================================================================
   PROJECT INVITATIONS SERVICE
   ========================================================================= */

export async function inviteUserToProjectService(data: {
  projectId: string;
  email: string;
  stack?: string;
  role?: string;
  invitedById: string;
}) {
  const cleanEmail = data.email.toLowerCase().trim();

  // 1. Check if user already exists
  const existingUser = await findUserByEmail(cleanEmail);
  if (existingUser) {
    const member = await findProjectMember(data.projectId, existingUser.id);
    if (member && member.status === MembershipStatus.ACTIVE) {
      throw new Error("User is already a member of this project");
    }
  }

  // 2. Check for duplicate pending invites
  const existingInvites = await findProjectInvites(data.projectId);
  const alreadyInvited = existingInvites.find(
    (inv) => inv.email.toLowerCase() === cleanEmail && inv.status === "pending"
  );

  if (alreadyInvited) {
    return alreadyInvited;
  }

  // 3. Create project invite
  const invite = await createProjectInvite({
    projectId: data.projectId,
    email: cleanEmail,
    stack: data.stack,
    role: data.role,
    invitedById: data.invitedById,
  });

  return invite;
}

export async function getProjectInvitesService(projectId: string) {
  return findProjectInvites(projectId);
}

export async function getMyPendingInvitesService(email: string) {
  return findPendingInvitesByEmail(email);
}

export async function acceptProjectInviteService(
  inviteId: string,
  currentUserId: string,
  currentUserEmail: string
) {
  const invite = await findInviteById(inviteId);

  if (!invite) {
    throw new Error("Invite not found");
  }

  if (invite.status !== "pending") {
    throw new Error(`Invite is already ${invite.status}`);
  }

  if (invite.email.toLowerCase() !== currentUserEmail.toLowerCase()) {
    throw new Error("This invite was issued to a different email address");
  }

  // Add user as active ProjectMember
  const existingMember = await findProjectMember(invite.projectId, currentUserId);
  if (!existingMember) {
    await createProjectMember({
      userId: currentUserId,
      projectId: invite.projectId,
      stack: invite.stack,
      role: (invite.role as any) === "OWNER" ? MemberRole.OWNER : MemberRole.MEMBER,
      status: MembershipStatus.ACTIVE,
    });
  } else if (existingMember.status !== MembershipStatus.ACTIVE) {
    await updateProjectMemberStatus(existingMember.id, MembershipStatus.ACTIVE);
  }

  // Update invite status to accepted
  await updateInviteStatus(inviteId, "accepted");

  return invite.project;
}

export async function declineProjectInviteService(
  inviteId: string,
  currentUserEmail: string
) {
  const invite = await findInviteById(inviteId);

  if (!invite) {
    throw new Error("Invite not found");
  }

  if (invite.email.toLowerCase() !== currentUserEmail.toLowerCase()) {
    throw new Error("Unauthorized to decline this invite");
  }

  await updateInviteStatus(inviteId, "declined");
}

export async function cancelProjectInviteService(inviteId: string) {
  await deleteProjectInvite(inviteId);
}