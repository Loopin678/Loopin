import {createProjectMember,findProjectMember,findProjectMembers,findProjectMembershipsByUserId,
  deleteProjectMember,} from "../repositories/project-member.repository";

export async function addProjectMemberService(data: {
  userId: string;
  projectId: string;
  stack: string;
}){
     const existingMember = await findProjectMember(data.projectId, data.userId);

     if(existingMember) {
throw new Error("User is already a member of this project");     }

     const member = await createProjectMember(data);

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