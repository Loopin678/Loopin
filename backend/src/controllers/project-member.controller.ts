import { Request, Response } from "express";

import {
  addProjectMemberService,
  getProjectMemberService,
  getProjectMembersService,
  getProjectMembershipsByUserIdService,
  removeProjectMemberService,
  getPendingProjectInvitationService,
  acceptProjectInvitationService,
  declineProjectInvitationService,
} from "../services/project-member.service";

export async function addProjectMember(req: Request,res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    // replace userId with email since that shit is unique
    const { email, stack } = req.body;

    if (typeof projectId !== "string") {
      res.status(400).json({
        message: "Invalid projectId",
      });
      return;
    }

    if (!email || typeof email !== "string") {
      res.status(400).json({
        message: "email is required",
      });
      return;
    }

    if (!stack || typeof stack !== "string") {
      res.status(400).json({
        message: "stack is required",
      });
      return;
    }

    const member = await addProjectMemberService({
      projectId,
      email,
      stack,
    });

    res.status(201).json({
      member,
    });
  } catch (error) {
    if(error instanceof Error && error.message === "NO_USER_FOUND"){
      res.status(404).json({
        message: "No user found with that email",
      });
      return;
    }

    if(error instanceof Error && error.message === "ALREADY_MEMBER_OR_PENDING"){
      res.status(409).json({
        message:
          "User is already a member or has a pending invite",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export async function getProjectMember(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { projectId, userId } = req.params;

    if (
      typeof projectId !== "string" ||
      typeof userId !== "string"
    ) {
      res.status(400).json({
        message: "Invalid projectId or userId",
      });
      return;
    }

    const member = await getProjectMemberService(
      projectId,
      userId
    );

    res.status(200).json({
      member,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Project member not found"
    ) {
      res.status(404).json({
        message: error.message,
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export async function getProjectMembers(req: Request,res: Response): Promise<void> {
try {
     const { projectId } = req.params;

     if (typeof projectId !== "string") {
          res.status(400).json({
          message: "Invalid projectId",
          });
          return;
     }

     const members = await getProjectMembersService(projectId);

     res.status(200).json({
          members,
     });
} 
catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export async function getProjectMembershipsByUserId(req: Request,res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      res.status(400).json({
        message: "Invalid userId",
      });
      return;
    }

    const memberships = await getProjectMembershipsByUserIdService(userId);

    res.status(200).json({memberships,});
} 
catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export async function removeProjectMember(
  req: Request,
  res: Response
): Promise<void> {
try {
    const { projectId, userId } = req.params;

     if (typeof projectId !== "string" || typeof userId !== "string"){
      res.status(400).json({
        message: "Invalid projectId or userId",
      });
      return;
    }

    await removeProjectMemberService(projectId, userId);

    res.status(204).send();
} 
catch (error) {
     if (error instanceof Error && error.message === "Project member not found"){
          res.status(404).json({
          message: error.message,
          });
          return;
     }

     console.error(error);

     res.status(500).json({message: "Internal Server Error",});
}
}

export async function getPendingProjectInvitations(req: Request, res: Response):Promise<void>{
try {
    const userId = req.user?.id;

    if(!userId){
      res.status(401).json({
        message: "Authentication Required"
      });
      return; // return here tells TS after the check that userId must be a string
    }
    const invitations = await getPendingProjectInvitationService(userId);

    res.status(200).json({invitations})
} catch (err) {
  console.error(err);
}
}
export async function acceptProjectInvitation(req: Request, res: Response): Promise<void>{
try {
  const {projectId} = req.params;
  const userId = req.user?.id;

  if(typeof projectId !== "string"){
    res.status(400).json({message: "Invalid projectId"});
    return;
  }
  if(!userId){
    res.status(401).json({message:"Authentication required"});
    return;
  }
  await acceptProjectInvitationService(projectId, userId);

  res.status(200).json({
    message:"Invitation Accepted"
  });
  
}catch (err){
  if(err instanceof Error && err.message === "INVITE_NOT_FOUND_OR_NOT_PENDING"){
      res.status(404).json({message: "Pending invitation not found"});
      return;
    }

    console.error(err);

    res.status(500).json({
      message: "Internal Server Error",
    });}
}

export async function declineProjectInvitation(req: Request,res: Response): Promise<void> {
  try {
    const {projectId} = req.params;
    const userId = req.user?.id;

    if(typeof projectId !== "string"){
      res.status(400).json({message: "Invalid projectId"});
      return;
    }

    if(!userId){
      res.status(401).json({message: "Authentication required"});
      return;
    }

    await declineProjectInvitationService(projectId, userId);

    res.status(200).json({message: "Invitation declined"});
  }catch (error) {
    if (error instanceof Error && error.message === "INVITE_NOT_FOUND_OR_NOT_PENDING"){
      res.status(404).json({message: "Pending invitation not found"});
      return;
    }

    console.error(error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}