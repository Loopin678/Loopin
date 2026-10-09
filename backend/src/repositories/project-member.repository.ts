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

  const members = await prisma.projectMember.findMany({where: {
     projectId,
     status: MembershipStatus.ACTIVE,
},
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

export async function findPendingProjectInvitations(userId: string){
     return await prisma.projectMember.findMany({
          where:{
               userId, 
               status: MembershipStatus.PENDING,
          },
          include:{
               project:{
                    select:{
                         id: true,
                         name: true
                    }}
          },
          orderBy:{
               id: "asc",
          },

     });
}

export async function acceptPendingProjectInvitation(projectId: string, userId: string){
     return await prisma.projectMember.updateMany({
          where:{
               projectId,
               userId,
               status: MembershipStatus.PENDING,
          },
          data:{
               status: MembershipStatus.ACTIVE,
          },
     });
}
// just delete the invite in case of decline lmao deleteMany
export async function declinePendingProjectInvitation(projectId: string, userId: string){
     return await prisma.projectMember.deleteMany({
          where:{
               projectId,
               userId,
               status: MembershipStatus.PENDING,
          },
     });
}

export async function transferProjectOwnership(projectId: string, currentOwnerId: string,
     newOwnerId: string){

          // we gonna use transaction here cuz both changes are made simultaneously using this
          // owner is converted to member and desired member is made owner
          return await prisma.$transaction(async(tx)=>{
               const targetUpdate = await tx.projectMember.updateMany({
                    where:{
                         projectId,
                         userId: newOwnerId,
                         role: MemberRole.MEMBER,
                         status: MembershipStatus.ACTIVE,
                    },
                    data:{
                         role: MemberRole.OWNER,
                    },
               });
               if(targetUpdate.count !== 1){
                    throw new Error("TARGET_NOT_ACTIVE_MEMBER");
               }
               // current requester must still be active owner
               const ownerUpdate = await tx.projectMember.updateMany({
                    where: {
                         projectId,
                         userId: currentOwnerId,
                         role: MemberRole.OWNER,
                         status: MembershipStatus.ACTIVE,
                         },
                    data: {
                         role: MemberRole.MEMBER,
                         },
               })
               if (ownerUpdate.count !== 1) {
                    throw new Error("NOT_PROJECT_OWNER");
               }

          });
     }