import { Server as SocketIOServer} from "socket.io";
import { Server as HTTPServer} from "http";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./auth";
import { findProjectMember } from "../repositories/project-member.repository";
import { registerMessageHandlers } from "../Sockets/message.socket";

let io: SocketIOServer | null = null;

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
            origin: "http://localhost:5173",
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
            const payload = jwt.verify(token, JWT_SECRET);

            if (!isAuthPayload(payload)) {
                return next(new Error("Invalid authentication token"));
            }

            socket.data.userId = payload.userId;
            next();
        } catch (error) {
            next(new Error("Invalid or expired authentication token"));
        }
    })

    io.on("connection" , (socket) => { //Waits for frontend to create a socket connection and then runs this and then the event listeners listen to further requests
        // event listeners for this connection go here

        socket.on("join-project", async (projectId: string) => {
        const userId = socket.data.userId as string;

        const membership = await findProjectMember(projectId, userId);

        if (!membership) {
            socket.emit("error", { message: "You are not a member of this project" });
            return;
        }

        socket.join(`project:${projectId}`);
        });

        registerMessageHandlers(getIO(), socket);

    });

    return io;
}

export function getIO(): SocketIOServer {
    if (!io) {
        throw new Error("Socket.IO has not been initialized yet");
    }
    return io;
}