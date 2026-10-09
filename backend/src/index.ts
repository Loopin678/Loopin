import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import apiRoutes from "./routes/index";
import { createServer } from "http";
import { initSocket } from "./library/socket";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api", apiRoutes);

const port = process.env.PORT || 3000;

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => console.log(`Server on http://localhost:${port}`));