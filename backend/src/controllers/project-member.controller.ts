import { Request, Response } from "express";
import { getIO, removeUserFromProjectRoom } from "../library/socket";
import { assertActiveMember } from "../services/access.service";

import {
  addProjectMemberService,
  getProjectMemberService,
  getProjectMembersService,
  getProjectMembershipsByUserIdService,
  removeProjectMemberService,
  getPendingProjectInvitationService,
  acceptProjectInvitationService,
  declineProjectInvitationService,
  transferProjectOwnershipService,
  getOutgoingProjectInvitationsService} from "../services/project-member.service";


export async function getOutgoingProjectInvitations(
  req: Request,
  res: Response
) {
  const projectId = req.params.projectId;
  const requesterId = req.user?.id;

  if (typeof projectId !== "string" || !projectId.trim()) {
    return res.status(400).json({ message: "Valid Project ID is required" });
  }

  if (!requesterId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const invitations = await getOutgoingProjectInvitationsService(
      projectId,
      requesterId
    );

    return res.status(200).json({ invitations });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "FORBIDDEN_OUTGOING_INVITATIONS"
    ) {
      return res.status(403).json({ message: "Active project member access required" });
    }

    console.error("Failed to fetch outgoing invitations:", error);
    return res.status(500).json({ message: "Failed to fetch invitations" });
  }
}

export async function addProjectMember(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { projectId } = req.params;
    const { email, stack } = req.body;
    const requesterId = req.user?.id;

    // 1. Validate projectId
    if (typeof projectId !== "string" || !projectId.trim()) {
      res.status(400).json({
        message: "Invalid projectId",
      });
      return;
    }

    // 2. Check authentication
    if (!requesterId) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    // 3. Validate email
    if (typeof email !== "string" || !email.trim()) {
      res.status(400).json({
        message: "Valid email is required",
      });
      return;
    }

    // 4. Validate stack
    if (typeof stack !== "string" || !stack.trim()) {
      res.status(400).json({
        message: "Stack is required",
      });
      return;
    }

    // 5. Create invitation with requester authorization
    const member = await addProjectMemberService(
      {
        projectId,
        email,
        stack,
      },
      requesterId
    );

    // Broadcast using ids from the verified returned row, not req.params/body
    const io = getIO();
    io.to(`user:${member.userId}`).emit("invite:received", member);
    io.to(`project:${member.projectId}`).emit("invite:created", member);

    res.status(201).json({
      member,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FORBIDDEN_INVITE") {
        res.status(403).json({
          message: "Only an active project owner can invite members",
        });
        return;
      }

      if (error.message === "NO_USER_FOUND") {
        res.status(404).json({
          message: "No user found with that email",
        });
        return;
      }

      if (error.message === "ALREADY_MEMBER_OR_PENDING") {
        res.status(409).json({
          message: "User is already a member or has a pending invite",
        });
        return;
      }
    }

    console.error("Failed to add project member:", error);

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

    const requesterId = req.user?.id;
    if (!requesterId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    await assertActiveMember(projectId, requesterId);

    const member = await getProjectMemberService(
      projectId,
      userId
    );

    res.status(200).json({
      member,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_NOT_PROJECT_MEMBER") {
      res.status(403).json({ message: "You are not a member of this project" });
      return;
    }
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

     const requesterId = req.user?.id;
     if (!requesterId) {
          res.status(401).json({ message: "Authentication required" });
          return;
     }
     await assertActiveMember(projectId, requesterId);

     const members = await getProjectMembersService(projectId);

     res.status(200).json({
          members,
     });
} 
catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_NOT_PROJECT_MEMBER") {
      res.status(403).json({ message: "You are not a member of this project" });
      return;
    }
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

    const requesterId = req.user?.id;
    if (!requesterId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    if (userId !== requesterId) {
      res.status(403).json({ message: "You can only view your own memberships" });
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

export async function removeProjectMember(req: Request,res: Response): Promise<void>{
try {
    const { projectId, userId } = req.params;
    const requesterId = req.user?.id;


    if(typeof projectId !== "string" || typeof userId !== "string"){
      res.status(400).json({
        message: "Invalid projectId or userId",
      });
      return;
    }
    if(!requesterId){
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const removed = await removeProjectMemberService(projectId, requesterId, userId);

    // ids come from the returned row, not req.params
    const payload = { projectId: removed.projectId, userId: removed.userId };
    const io = getIO();

    if (removed.status === "PENDING") {
      io.to(`user:${removed.userId}`)
        .to(`project:${removed.projectId}`)
        .emit("invite:revoked", payload);
    } else {
      io.to(`project:${removed.projectId}`)
        .to(`user:${removed.userId}`)
        .emit("member:removed", payload);

      // Kick the removed member's sockets out of the project room
      removeUserFromProjectRoom(removed.projectId, removed.userId);
    }

    res.status(204).send();
} 
catch (error) {
    if (!(error instanceof Error)) {
      res.status(500).json({ message: "Internal Server Error" });
      return;
    }

    const forbiddenMessages: Record<string, string> = {
      FORBIDDEN_NO_ACTIVE_MEMBERSHIP:
        "You must be an active project member to perform this action",
      FORBIDDEN_MEMBER_CANNOT_REMOVE_OTHERS:
        "Members can only remove themselves",
      OWNER_CANNOT_REMOVE_SELF:
        "Transfer ownership or delete the project instead of removing yourself as owner",
      FORBIDDEN_OWNER_CANNOT_REMOVE_OWNER:
        "An owner cannot remove another owner",
    };

    if (forbiddenMessages[error.message]) {
      res.status(403).json({
        message: forbiddenMessages[error.message],
      });
      return;
    }

    if (error.message === "Project member not found") {
      res.status(404).json({ message: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getPendingProjectInvitations(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const invitations = await getPendingProjectInvitationService(userId);

    res.status(200).json({ invitations });
  } catch (error) {
    console.error("Failed to fetch incoming invitations:", error);

    res.status(500).json({
      message: "Failed to fetch invitations",
    });
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

  // The service throws unless a PENDING row for exactly this projectId + userId
  // was updated, so these ids are verified by the database.
  const io = getIO();
  io.to(`project:${projectId}`).emit("member:joined", { projectId, userId });
  io.to(`user:${userId}`).emit("invite:resolved", { projectId, accepted: true });

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

    const io = getIO();
    io.to(`project:${projectId}`).emit("invite:declined", { projectId, userId });
    io.to(`user:${userId}`).emit("invite:resolved", { projectId, accepted: false });

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

export async function transferProjectOwnershipController(req: Request,res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const currentOwnerId = req.user?.id;
    const { newOwnerId } = req.body;

    if(typeof projectId !== "string"){
      res.status(400).json({ message: "Invalid projectId" });
      return;
    }

    if(!currentOwnerId){
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    if(typeof newOwnerId !== "string" || !newOwnerId.trim()){
      res.status(400).json({
        message: "newOwnerId is required",
      });
      return;
    }

    const newOwner = newOwnerId.trim();
    await transferProjectOwnershipService(projectId, currentOwnerId, newOwner);

    getIO().to(`project:${projectId}`).emit("ownership:transferred", {
      projectId,
      previousOwnerId: currentOwnerId,
      newOwnerId: newOwner,
    });

    res.status(200).json({
      message: "Project ownership transferred successfully",
    });

  }catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_PROJECT_OWNER") {
        res.status(403).json({
          message: "Only the active project owner can transfer ownership",
        });
        return;
      }

      if (error.message === "TARGET_NOT_ACTIVE_MEMBER") {
        res.status(400).json({
          message: "The new owner must be an active project member",
        });
        return;
      }

      if (error.message === "CANNOT_TRANSFER_OWNERSHIP_TO_SELF") {
        res.status(400).json({
          message: "You are already the project owner",
        });
        return;
      }
    }

    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}