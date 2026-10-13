import { createProject, findProjectById, findProjectsByUserId
     ,updateProject, deleteProject } from "../repositories/project.repository";

import { createProjectMember, findProjectMembers } from "../repositories/project-member.repository";  
import { MemberRole, MembershipStatus } from "@prisma/client";
import { assertActiveMember, assertProjectOwner } from "./access.service";

export async function createProjectService(data:{ name: string,
  userId: string;
  stack: string;
}){
     if(!data.name || data.name.trim().length === 0){
          throw new Error("Project Name is Required");
     }
       if (!data.userId || data.userId.trim().length === 0) {
    throw new Error("User ID is Required");
  }

  if (!data.stack || data.stack.trim().length === 0) {
    throw new Error("Stack is Required")
  }
  // creating project with basic name
     const project = await createProject({name: data.name.trim()});
// creating project with main user's data n more shit 
    await createProjectMember({
      userId: data.userId,
      projectId: project.id,
      stack: data.stack.trim(),
      role: MemberRole.OWNER,
      status: MembershipStatus.ACTIVE,
    });

     return project;
}

export async function getProjectByIdService(projectId: string, requesterId: string){
     await assertActiveMember(projectId, requesterId);
     const project = await findProjectById(projectId);

     if(!project){
          throw new Error("Project not found");
     }

     return project;
}


export async function getProjectsByUserIdService(userId: string){

  const projects = await findProjectsByUserId(userId);

  return projects;
}




export async function updateProjectService(projectId: string, requesterId: string, data: {name?: string;}){

  await assertProjectOwner(projectId, requesterId);

  const existingProject = await findProjectById(projectId);

  if (!existingProject) {
    throw new Error("Project not found");
  }

  if (data.name !== undefined && data.name.trim().length === 0) {
    throw new Error("Project name can't be empty");
  }

  const project = await updateProject(projectId, {name: data.name?.trim(),});

  return project;
}



export async function deleteProjectService(projectId: string, requesterId: string) {
  await assertProjectOwner(projectId, requesterId);

  const existingProject = await findProjectById(projectId);

  if (!existingProject) {
    throw new Error("Project not found or Doesnt exist");
  }

    // Capture who to notify before the delete wipes the member rows
  const members = await findProjectMembers(projectId);

  await deleteProject(projectId);

  return { id: existingProject.id, memberIds: members.map((m) => m.userId) };
}
