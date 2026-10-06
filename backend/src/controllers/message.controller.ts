import { Request, Response } from "express";
import * as messageService from "../services/message.service";

export async function getMessages(req: Request, res: Response) {
  try {
    const messages = await messageService.getProjectMessages(req.params.projectId);
    res.json(messages);
  } catch (err) {
    console.error("GET_MESSAGES_ERROR:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
}