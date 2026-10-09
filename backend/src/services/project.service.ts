import { createProject, findProjectById, findProjectsByUserId
     ,updateProject, deleteProject } from "../repositories/project.repository";

import { createProjectMember } from "../repositories/project-member.repository";   
import { listRepository } from "../repositories/listRepository";
import { MemberRole, MembershipStatus } from "@prisma/client";

export async function createProjectService(data:{ name: string,
  userId: string;
  stack?: string;
}){
     if(!data.name || data.name.trim().length === 0){
          throw new Error("Project Name is Required");
     }
       if (!data.userId || data.userId.trim().length === 0) {
    throw new Error("User ID is Required");
  }

  const stack = data.stack?.trim() || "fullstack";
  // creating project with basic name
     const project = await createProject({name: data.name.trim()});
// creating project with main user's data
    await createProjectMember({
      userId: data.userId,
      projectId: project.id,
      stack,
      role: MemberRole.OWNER,
      status: MembershipStatus.ACTIVE,
    });

    try {
      await listRepository.createList({ projectId: project.id, name: "Backlog" });
      await listRepository.createList({ projectId: project.id, name: "In Progress" });
      await listRepository.createList({ projectId: project.id, name: "Review" });
      await listRepository.createList({ projectId: project.id, name: "Done" });
    } catch (e) {
      console.error("Failed to create default lists:", e);
    }

     return project;
}

export async function getProjectByIdService(projectId: string){
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




export async function updateProjectService(projectId: string,data: {name?: string;}){

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



export async function deleteProjectService(projectId: string) {
  const existingProject = await findProjectById(projectId);

  if (!existingProject) {
    throw new Error("Project not found or Doesnt exist");
  }

  await deleteProject(projectId);
}