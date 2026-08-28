import "dotenv/config"
import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"                                    // ADDED
import http from "http"                                     // ADDED
import { Server } from "socket.io"                          // ADDED
import apiRoutes from "./routes/index";
import { prisma } from "./library/prisma"
import { registerMessageHandlers } from "./sockets/message.socket"  // ADDED

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true })); // ADDED
app.use(express.json());
app.use(cookieParser());

app.use("/api", apiRoutes);

const server = http.createServer(app);                      // ADDED (replaces app.listen below)
const io = new Server(server, {                             // ADDED
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }
});

io.on("connection", (socket) => {                            // ADDED
  console.log("Socket connected:", socket.id);

  socket.on("join_project", (projectId: string) => {
    socket.join(projectId);
  });

  registerMessageHandlers(io, socket);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

const port = process.env.PORT || 4000;

server.listen(port, () => console.log(`Server on: ${port}`)); // CHANGED from app.listen