import { MemberRole, MembershipStatus } from "@prisma/client";
import { findUserByEmail } from "../repositories/user.repository";
import {createProjectMember,findProjectMember,findProjectMembers,findProjectMembershipsByUserId,
  deleteProjectMember,} from "../repositories/project-member.repository";

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

export async function removeProjectMemberService(
  projectId: string,
  userId: string
){
     const removed = await deleteProjectMember(projectId, userId);

     // just in case after removal the proj-mem still exists
     if (!removed) {
     throw new Error("Project member not found");
     }
}