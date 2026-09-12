import { Request, Response } from "express";

import {
  addProjectMemberService,
  getProjectMemberService,
  getProjectMembersService,
  getProjectMembershipsByUserIdService,
  removeProjectMemberService,
} from "../services/project-member.service";

export async function addProjectMember(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { projectId } = req.params;
    const { userId, stack } = req.body;

    if (typeof projectId !== "string") {
      res.status(400).json({
        message: "Invalid projectId",
      });
      return;
    }

    if (!userId || typeof userId !== "string") {
      res.status(400).json({
        message: "userId is required",
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
      userId,
      stack,
    });

    res.status(201).json({
      member,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "User is already a member of this project"
    ) {
      res.status(409).json({
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