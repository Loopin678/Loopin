import {prisma } from "../library/prisma.js"


export async function createProject(data: {name: string;}){

    const project = await prisma.project.create({data});

     return project;
}


export async function findProjectById(projectId: string){
  const project = await prisma.project.findUnique({
      where:{
        id: projectId,
      }
  })

  return project;
}


// export async function findProjectsByOwnerId(
//   ownerId: string
// ): Promise<Project[]> {
//   const userProjects: Project[] = [];

//   for (const project of projects.values()) {
//     if (project.ownerId === ownerId) {
//       userProjects.push(project);
//     }
//   }

//   return userProjects;
// }

export async function findProjectsByUserId(userId: string){
  const userProjects = await prisma.project.findMany({
    where:{
      members:{
        some:{
          userId,
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
