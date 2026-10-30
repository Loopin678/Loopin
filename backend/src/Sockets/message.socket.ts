import { Server, Socket } from "socket.io";
import * as messageService from "../services/message.service";
import { assertActiveMember } from "../services/access.service";
import { SendMessagePayload } from "../types/message";

const MAX_MESSAGE_LENGTH = 4000;

export function registerMessageHandlers(io: Server, socket: Socket) {
  socket.on("send_message", async (data: SendMessagePayload) => {
    try {
      // Identity comes from the verified handshake cookie, never from the client
      const senderId = socket.data.userId as string;

      if (
        !data ||
        typeof data.projectId !== "string" ||
        typeof data.content !== "string" ||
        !data.content.trim() ||
        data.content.length > MAX_MESSAGE_LENGTH
      ) {
        socket.emit("message_error", { error: "Invalid message" });
        return;
      }

      // Must be an ACTIVE member of the project (checked against the database,
      // so it also stops someone who was removed but still has a socket open)
      await assertActiveMember(data.projectId, senderId);

      const { message, isAiMentioned, aiUser } = await messageService.sendMessage(
        data.projectId,
        senderId,
        data.content
      );

      io.to(`project:${data.projectId}`).emit("new_message", message);

      if (isAiMentioned && aiUser) {
        io.to(`project:${data.projectId}`).emit("ai_typing", true);
        try {
          const aiMessage = await messageService.generateAiReply(data.projectId, aiUser.id);
          io.to(`project:${data.projectId}`).emit("new_message", aiMessage);
        } finally {
          // Runs even if the AI reply throws, so the indicator never gets stuck
          io.to(`project:${data.projectId}`).emit("ai_typing", false);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message === "FORBIDDEN_NOT_PROJECT_MEMBER") {
        socket.emit("message_error", { error: "You are not a member of this project" });
        return;
      }
      console.error("SEND_MESSAGE ERROR:", err);
      socket.emit("message_error", { error: "Failed to send message" });
    }
  });
}