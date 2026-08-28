import { Server, Socket } from "socket.io";
import * as messageService from "../services/message.service";
import { SendMessagePayload } from "../types/message";

export function registerMessageHandlers(io: Server, socket: Socket) {
  socket.on("send_message", async (data: SendMessagePayload) => {
    try {
      const { message, isAiMentioned, aiUser } = await messageService.sendMessage(
        data.projectId,
        data.senderId,
        data.content
      );

      io.to(data.projectId).emit("new_message", message);

      if (isAiMentioned && aiUser) {
        io.to(data.projectId).emit("ai_typing", true);
        const aiMessage = await messageService.generateAiReply(data.projectId, aiUser.id);
        io.to(data.projectId).emit("ai_typing", false);
        io.to(data.projectId).emit("new_message", aiMessage);
      }
    } catch (err) {
      console.error("SEND_MESSAGE ERROR:", err);
      socket.emit("message_error", { error: "Failed to send message" });
    }
  });
}