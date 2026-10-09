import { MemberRole, MembershipStatus } from "@prisma/client";
import { findUserByEmail } from "../repositories/user.repository";
import {createProjectMember,findProjectMember,findProjectMembers,findProjectMembershipsByUserId,
  deleteProjectMember,
  findPendingProjectInvitations,
  acceptPendingProjectInvitation,
  declinePendingProjectInvitation,
  transferProjectOwnership} from "../repositories/project-member.repository";

export async function addProjectMemberService(data: {
  email: string;
  projectId: string;
  stack: string;
}){
    const normalizedEmail = data.email.toLowerCase().trim();

    const user = await findUserByEmail(normalizedEmail);

    if(!user){
        throw new Error("NO_USER_FOUND");

    }
    const existingMember = await findProjectMember(data.projectId, user.id);

    if (existingMember) {
      throw new Error("ALREADY_MEMBER_OR_PENDING");
    }

    const member = await createProjectMember({
        userId: user.id,
        projectId: data.projectId,
        stack: data.stack.trim(),
        role: MemberRole.MEMBER,
        status: MembershipStatus.PENDING,
    });

    return member;
}


export async function getProjectMemberService(projectId: string,userId: string){
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

export async function getProjectMembershipsByUserIdService(userId: string){

  const memberships = await findProjectMembershipsByUserId(userId);

  return memberships;
}

export async function removeProjectMemberService(projectId: string, requesterId: string,
  userIdToRemove: string){
  //confirm requester's existence
  const requester = await findProjectMember(projectId, requesterId);

  if (!requester || requester.status !== MembershipStatus.ACTIVE){
      throw new Error("FORBIDDEN_NO_ACTIVE_MEMBERSHIP");
  }

  const target = await findProjectMember(projectId, userIdToRemove);

  if(!target){
    throw new Error("Project member not found");
  }

  if(requester.role === MemberRole.MEMBER){
    if(userIdToRemove !== requesterId){
      throw new Error("FORBIDDEN_MEMBER_CANNOT_REMOVE_OTHERS");
    }
  } else if (requester.role === MemberRole.OWNER) {
    if (userIdToRemove === requesterId) {
      throw new Error("OWNER_CANNOT_REMOVE_SELF");
    }

    if (target.role !== MemberRole.MEMBER) {
      throw new Error("FORBIDDEN_OWNER_CANNOT_REMOVE_OWNER");
    }
  }

  const removed = await deleteProjectMember(projectId, userIdToRemove);
  // just in case to recheck project member still exitst
  if (!removed) {
    throw new Error("Project member not found");
  }
}

export async function getPendingProjectInvitationService(userId: string){
  return await findPendingProjectInvitations(userId);
}

export async function acceptProjectInvitationService(projectId: string, userId: string){
    const result = await acceptPendingProjectInvitation(projectId, userId);

    if(result.count === 0){
        throw new Error("INVITE_NOT_FOUND_OR_NOT_PENDING");
    }
}

export async function declineProjectInvitationService(projectId: string, userId: string){
  const result = await declinePendingProjectInvitation(projectId, userId);
  if(result.count === 0){
        throw new Error("INVITE_NOT_FOUND_OR_NOT_PENDING");
    }
  
}
export async function transferProjectOwnershipService(projectId: string, currentOwnerId: string, 
  newOwnerId: string){
    if(currentOwnerId === newOwnerId){
    throw new Error("CANNOT_TRANSFER_OWNERSHIP_TO_SELF");
    }
    await transferProjectOwnership(projectId, currentOwnerId, newOwnerId);
  }