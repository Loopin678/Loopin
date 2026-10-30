import {prisma } from "../library/prisma.js"
import { ListKind, MemberRole, MembershipStatus } from "@prisma/client";

// No one calls this now (as createProjectWithOwner is used in the service) can remove but for now keeping it 
export async function createProject(data: {name: string;}){

  const project = await prisma.project.create({data});

  return project;

}

// Creates the project, its owner and the three starter lists in ONE transaction
export async function createProjectWithOwner(data: { name: string; ownerId: string; stack: string; }) {
  
  const project = await prisma.project.create({
    data: {
      name: data.name,
      members: {
        create: {
          userId: data.ownerId,
          stack: data.stack,
          role: MemberRole.OWNER,
          status: MembershipStatus.ACTIVE,
        },
      },
      lists: {
        create: [
          { name: "To Do", position: 0, kind: ListKind.TODO },
          { name: "In Progress", position: 1, kind: ListKind.IN_PROGRESS },
          { name: "Done", position: 2, kind: ListKind.DONE },
        ],
      },
    },
  });

  return project;
}


export async function findProjectById(projectId: string){
  const project = await prisma.project.findUnique({
      where:{
        id: projectId,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
  })

  return project;
}

export async function findProjectsByUserId(userId: string){
  const userProjects = await prisma.project.findMany({
    where:{
      members:{
        some:{
          userId,
          status: "ACTIVE",
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy:{
      createdAt: "desc",
    }
  })

  return userProjects;
}

export async function updateProject(projectId: string,data:{name?: string}){

  const project = await prisma.project.update({
    where:{id: projectId},data
  });

  if (!project) {
    return null;
  }

  return project;
}


// The foreign keys to Project are ON DELETE RESTRICT, so deleting only the project
// row always failed. Remove its contents first, children before parents, in one
// transaction so a failure leaves the project intact.
export async function deleteProject(projectId: string){
    await prisma.$transaction([
        prisma.mention.deleteMany({ where: { message: { projectId } } }),
        prisma.message.deleteMany({ where: { projectId } }),
        prisma.task.deleteMany({ where: { projectId } }),
        prisma.commit.deleteMany({ where: { projectId } }),
        prisma.list.deleteMany({ where: { projectId } }),
        prisma.projectMember.deleteMany({ where: { projectId } }),
        prisma.project.delete({ where: { id: projectId } }),
    ]);
}
