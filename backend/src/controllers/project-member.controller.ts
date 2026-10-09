import { Request, Response } from "express";

import {
  addProjectMemberService,
  getProjectMemberService,
  getProjectMembersService,
  getProjectMembershipsByUserIdService,
  removeProjectMemberService,
  inviteUserToProjectService,
  getProjectInvitesService,
  getMyPendingInvitesService,
  acceptProjectInviteService,
  declineProjectInviteService,
  cancelProjectInviteService,
} from "../services/project-member.service";

export async function addProjectMember(req: Request,res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const { userId, email, stack } = req.body;

    if (typeof projectId !== "string") {
      res.status(400).json({
        message: "Invalid projectId",
      });
      return;
    }

    if (!userId && (!email || typeof email !== "string")) {
      res.status(400).json({
        message: "userId or email is required",
      });
      return;
    }

    const member = await addProjectMemberService({
      projectId,
      userId,
      email,
      stack: stack || "fullstack",
    });

    res.status(201).json({
      member,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_USER_FOUND") {
      res.status(404).json({
        message: "No user found with that email",
      });
      return;
    }

    if (
      error instanceof Error &&
      (error.message === "ALREADY_MEMBER_OR_PENDING" ||
        error.message.includes("already an active member") ||
        error.message.includes("already a member"))
    ) {
      res.status(409).json({
        message:
          "User is already a member or has a pending invite",
      });
      return;
    }

    if (error instanceof Error && error.message.includes("not found")) {
      res.status(404).json({
        message: error.message,
      });
      return;
    }

    console.error("addProjectMember error:", error);
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

    if (typeof projectId !== "string" || typeof userId !== "string") {
      res.status(400).json({
        message: "Invalid projectId or userId",
      });
      return;
    }

    const member = await getProjectMemberService(projectId, userId);

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

export async function getProjectMembers(
  req: Request,
  res: Response
): Promise<void> {
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
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export async function getProjectMembershipsByUserId(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      res.status(400).json({
        message: "Invalid userId",
      });
      return;
    }

    const memberships = await getProjectMembershipsByUserIdService(userId);

    res.status(200).json({
      memberships,
    });
  } catch (error) {
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

    if (typeof projectId !== "string" || typeof userId !== "string") {
      res.status(400).json({
        message: "Invalid projectId or userId",
      });
      return;
    }

    await removeProjectMemberService(projectId, userId);

    res.status(204).send();
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

/* =========================================================================
   PROJECT INVITES CONTROLLERS
   ========================================================================= */

export async function sendProjectInvite(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { projectId } = req.params;
    const { email, stack, role } = req.body;
    const invitedById = req.user?.id;

    if (!invitedById) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!projectId || typeof projectId !== "string") {
      res.status(400).json({ message: "Invalid projectId" });
      return;
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ message: "Valid email address is required" });
      return;
    }

    const invite = await inviteUserToProjectService({
      projectId,
      email,
      stack: stack || "fullstack",
      role: role || "MEMBER",
      invitedById,
    });

    res.status(201).json({ invite });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already a member")) {
      res.status(409).json({ message: error.message });
      return;
    }

    console.error("sendProjectInvite error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getProjectInvites(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { projectId } = req.params;

    if (!projectId || typeof projectId !== "string") {
      res.status(400).json({ message: "Invalid projectId" });
      return;
    }

    const invites = await getProjectInvitesService(projectId);
    res.status(200).json({ invites });
  } catch (error) {
    console.error("getProjectInvites error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function cancelProjectInvite(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { inviteId } = req.params;

    if (!inviteId || typeof inviteId !== "string") {
      res.status(400).json({ message: "Invalid inviteId" });
      return;
    }

    await cancelProjectInviteService(inviteId);
    res.status(204).send();
  } catch (error) {
    console.error("cancelProjectInvite error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

import { findUserById } from "../repositories/user.repository";

export async function getMyInvites(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const user = await findUserById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const invites = await getMyPendingInvitesService(user.email);
    res.status(200).json({ invites });
  } catch (error) {
    console.error("getMyInvites error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function acceptInvite(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { inviteId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const user = await findUserById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!inviteId || typeof inviteId !== "string") {
      res.status(400).json({ message: "Invalid inviteId" });
      return;
    }

    const project = await acceptProjectInviteService(inviteId, user.id, user.email);
    res.status(200).json({
      message: "Invitation accepted successfully",
      project,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error instanceof Error && (error.message.includes("different email") || error.message.includes("already"))) {
      res.status(400).json({ message: error.message });
      return;
    }

    console.error("acceptInvite error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function declineInvite(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { inviteId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const user = await findUserById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!inviteId || typeof inviteId !== "string") {
      res.status(400).json({ message: "Invalid inviteId" });
      return;
    }

    await declineProjectInviteService(inviteId, user.email);
    res.status(200).json({ message: "Invitation declined" });
  } catch (error) {
    console.error("declineInvite error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}