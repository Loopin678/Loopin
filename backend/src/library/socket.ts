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

        // Personal room: lets us reach this user directly (invites, removal
        // notices) no matter which project or page they're on.
        socket.join(`user:${socket.data.userId as string}`);
        
        // Projects this socket has started joining. Also stored on socket.data so
        // the helpers below can reset it when a member is removed.
        const claimed = new Set<string>();
        socket.data.claimed = claimed;

        socket.on("join-project", async (projectId: string) => {
            const userId = socket.data.userId as string;

            // Must run before any await, so two back-to-back events can't both pass
            if (claimed.has(projectId)) {
                socket.emit("presence:snapshot", { onlineUserIds: getOnlineUserIds(projectId) });
                return;
            }
            claimed.add(projectId);

            let membership;
            try {
                membership = await findProjectMember(projectId, userId);
            } catch (error) {
                claimed.delete(projectId);
                socket.emit("error", { message: "Could not verify project membership" });
                return;
            }

            const isActive = membership?.status === "ACTIVE";

            if (!isActive || !socket.connected) {
                claimed.delete(projectId);
                if (!isActive) {
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

// Called after a member is removed (or leaves). Their sockets stop receiving
// board and presence events now, not at their next reconnect.
export function removeUserFromProjectRoom(projectId: string, userId: string): void {
    const io = getIO();
    const room = `project:${projectId}`;

    io.sockets.sockets.forEach((s) => {
        if (s.data.userId !== userId) return;

        s.data.joinedProjects?.delete(projectId); // so disconnect doesn't decrement presence again
        s.data.claimed?.delete(projectId);        // so they can join again if re-invited
        s.leave(room);
    });

    // Remove them from presence in one go (they may have had several tabs open)
    const projectPresence = presence.get(projectId);
    const wasOnline = projectPresence?.delete(userId) ?? false;
    if (projectPresence && projectPresence.size === 0) {
        presence.delete(projectId);
    }

    if (wasOnline) {
        io.to(room).emit("presence:offline", { userId });
    }
}

// Called after a project is deleted. Tells everyone, then empties the room.
export function closeProjectRoom(projectId: string, memberIds: string[]): void {
    const io = getIO();
    const room = `project:${projectId}`;

    // Notify the room, plus each member's personal room, so members who are on the
    // All Projects page (and never joined the project room) hear about it too.
    // A socket in several of these rooms still receives the event once.
    io.to([room, ...memberIds.map((id) => `user:${id}`)]).emit("project:deleted", { projectId });

    io.sockets.sockets.forEach((s) => {
        if (!s.rooms.has(room)) return;
        s.data.joinedProjects?.delete(projectId);
        s.data.claimed?.delete(projectId);
        s.leave(room);
    });

    presence.delete(projectId);
}