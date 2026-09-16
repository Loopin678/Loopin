import {prisma } from "../library/prisma"

export async function createProjectMember(data:{
     userId: string;
     projectId: string;
     stack: string;
}){
     const member = await prisma.projectMember.create({data});

     return member;
}

export async function findProjectMember(
     projectId: string,
     userId: string
){
     const member = await prisma.projectMember.findUnique({
          where:{
               userId_projectId:{
                    userId,
                    projectId
               }
          }
     });

     return member;
}

export async function findProjectMembershipsByUserId(userId: string) {
  const memberships = await prisma.projectMember.findMany({
    where: {
      userId,
    },
    orderBy: {
      id: "asc",
    },
  });

  return memberships;
}

export async function findProjectMembers(projectId: string){

  const members = await prisma.projectMember.findMany({where: {projectId,},
                                                       orderBy: {
                                                            id: "asc",
                                                       },
     });

  return members;
}

export async function deleteProjectMember(
     projectId: string,
     userId: string
     ){
     const member = await prisma.projectMember.findUnique({
          where:{
               userId_projectId:{
                    userId,
                    projectId,
               }
          }
     });

     if(!member){
          return false;
     }

     await prisma.projectMember.delete({
          where:{
               id: member.id
          },
     });
     return true;
}