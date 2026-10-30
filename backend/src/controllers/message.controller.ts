import { Request, Response } from "express";
import * as messageService from "../services/message.service";
import { assertActiveMember } from "../services/access.service";

export async function getMessages(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;

    if (typeof projectId !== "string") {
      res.status(400).json({ message: "Invalid projectId" });
      return;
    }

    const requesterId = req.user?.id;
    if (!requesterId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    await assertActiveMember(projectId, requesterId);

    const messages = await messageService.getProjectMessages(projectId);

    res.status(200).json({ messages });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_NOT_PROJECT_MEMBER") {
      res.status(403).json({ message: "You are not a member of this project" });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}