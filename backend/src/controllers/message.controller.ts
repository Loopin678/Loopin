import { Request, Response } from "express";
import * as messageService from "../services/message.service";

export async function getMessages(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  if (typeof projectId !== "string") {
    res.status(400).json({ message: "Invalid projectId" });
    return;
  }

  const messages = await messageService.getProjectMessages(projectId);

  res.status(200).json({ messages });
}