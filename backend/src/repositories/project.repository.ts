import { Project } from "../types/project";

const projects = new Map<string, Project>();

export async function createProject(
     project: Project
): Promise<Project>{

     projects.set(project.id, project);

     return project;
}


export async function findProjectById(
  projectId: string
): Promise<Project | null> {

     return projects.get(projectId) ?? null;

}


export async function findProjectsByOwnerId(
  ownerId: string
): Promise<Project[]> {
  const userProjects: Project[] = [];

  for (const project of projects.values()) {
    if (project.ownerId === ownerId) {
      userProjects.push(project);
    }
  }

  return userProjects;
}


export async function updateProject(
  projectId: string,
  updates: Partial<
    Pick<Project, "name" | "description">
  >
): Promise<Project | null> {

  const project = projects.get(projectId);

  if (!project) {
    return null;
  }

  const updatedProject: Project = {
    ...project,
    ...updates,
    updatedAt: new Date(),
  };

  projects.set(
    projectId,
    updatedProject
  );

  return updatedProject;
}


export async function deleteProject(
  projectId: string
): Promise<boolean> {
     
     return projects.delete(projectId);
}
