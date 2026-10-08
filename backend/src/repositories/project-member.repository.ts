import {prisma } from "../library/prisma.js"
import { MemberRole, MembershipStatus } from "@prisma/client";

export async function createProjectMember(data:{
     userId: string;
     projectId: string;
     stack: string;
     role?: "OWNER" | "MEMBER";
     status?: "ACTIVE" | "PENDING"
}){
     const member = await prisma.projectMember.create({
          data,
     });

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