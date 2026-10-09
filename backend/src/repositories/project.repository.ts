import {prisma } from "../library/prisma"


export async function createProject(data: {name: string;}){

    const project = await prisma.project.create({data});

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


export async function deleteProject(projectId: string){
    await prisma.project.delete({where:{ id: projectId}});
}
