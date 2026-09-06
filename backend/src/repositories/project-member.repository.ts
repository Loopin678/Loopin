import { Project } from "@prisma/client";
import { ProjectMember } from "../types/project-member";

const storeProjectMem = new Map<string, ProjectMember>();

export async function createProjectMember(
     member: ProjectMember
): Promise<ProjectMember>{
     storeProjectMem.set(member.id, member)

     return member;
}

export async function findProjectMember(
     projectId: string,
     userId: string
):Promise<ProjectMember | null>{
     const found = [...storeProjectMem.values()].find(
          m=> m.projectId === projectId && m.userId === userId
     )
     return found ?? null;
}

export async function deleteProjectMember(
     projectId: string,
     userId: string
):Promise<boolean>{
     const member = await findProjectMember(projectId, userId);
     return member ? storeProjectMem.delete(member.id) : false;
}