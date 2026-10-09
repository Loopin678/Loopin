import { Server as SocketIOServer} from "socket.io";
import { Server as HTTPServer} from "http";
import jwt from "jsonwebtoken";
import { findProjectMember } from "../repositories/project-member.repository";
import { registerMessageHandlers } from "../Sockets/message.socket";

let io: SocketIOServer | null = null;

const presence = new Map<string, Map<string, number>>();

function incrementPresence(projectId: string, userId: string): boolean {
  if (!presence.has(projectId)) {
    presence.set(projectId, new Map());
  }
  const projectPresence = presence.get(projectId)!;
  const currentCount = projectPresence.get(userId) ?? 0;
  projectPresence.set(userId, currentCount + 1);
  return currentCount === 0;
}

function decrementPresence(projectId: string, userId: string): boolean {
  const projectPresence = presence.get(projectId);
  if (!projectPresence) return false;

  const currentCount = projectPresence.get(userId) ?? 0;
  if (currentCount <= 1) {
    projectPresence.delete(userId);
    if (projectPresence.size === 0) {
      presence.delete(projectId);
    }
    return true;
  }

  projectPresence.set(userId, currentCount - 1);
  return false;
}

function getOnlineUserIds(projectId: string): string[] {
  const projectPresence = presence.get(projectId);
  if (!projectPresence) return [];
  return Array.from(projectPresence.keys());
}

function extractTokenFromCookieHeader(cookieHeader: string | undefined):string | null{
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const authCookie = cookies.find((c) => c.startsWith("auth_token="));

    if (!authCookie) return null;

    return authCookie.split("=")[1] ?? null;
}

type AuthPayload = {
    userId: string;
}

function isAuthPayload(payload: string | jwt.JwtPayload): payload is AuthPayload {
    return  (
        typeof payload !== "string" &&
        typeof payload.userId === "string" &&
        payload.userId.length > 0
    );
}

export function initSocket(httpServer: HTTPServer): SocketIOServer {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL,
            credentials: true,
        },
    });

    io.use((socket, next) => {
        const cookieHeader = socket.handshake.headers.cookie;
        const token = extractTokenFromCookieHeader(cookieHeader);

        if(!token) {
            return next(new Error("Authentication required"));
        }

        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET!);

            if (!isAuthPayload(payload)) {
                return next(new Error("Invalid authentication token"));
            }

            socket.data.userId = payload.userId;
            next();
        } catch (error) {
            next(new Error("Invalid or expired authentication token"));
        }
    })

    io.on("connection", (socket) => {
        const claimed = new Set<string>(); // projects this socket has started joining

        socket.on("join-project", async (projectId: string) => {
            const userId = socket.data.userId as string;

            // Must run before any await, so two back-to-back events can't both pass
            if (claimed.has(projectId)) {
                socket.emit("presence:snapshot", { onlineUserIds: getOnlineUserIds(projectId) });
                return;
            }
            claimed.add(projectId);

            const membership = await findProjectMember(projectId, userId);

            if (!membership || !socket.connected) {
                claimed.delete(projectId);
                if (!membership) {
                    socket.emit("error", { message: "You are not a member of this project" });
                }
                return;
            }

            socket.join(`project:${projectId}`);

            if (!socket.data.joinedProjects) {
                socket.data.joinedProjects = new Set<string>();
            }
            socket.data.joinedProjects.add(projectId);

            if (incrementPresence(projectId, userId)) {
                socket.to(`project:${projectId}`).emit("presence:online", { userId });
            }

            socket.emit("presence:snapshot", { onlineUserIds: getOnlineUserIds(projectId) });
    });

        registerMessageHandlers(getIO(), socket);

        socket.on("disconnect", () => {
            const userId = socket.data.userId as string;
            const joinedProjects: Set<string> = socket.data.joinedProjects ?? new Set();

            joinedProjects.forEach((projectId) => {
                const wasLastConnection = decrementPresence(projectId, userId);
                if (wasLastConnection) {
                getIO().to(`project:${projectId}`).emit("presence:offline", { userId });
                }
            });
        });

    });

    return io;
}

export function getIO(): SocketIOServer {
    if (!io) {
        throw new Error("Socket.IO has not been initialized yet");
    }
    return io;
}