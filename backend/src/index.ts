import "dotenv/config"
import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import apiRoutes from "./routes/index";
import { createServer } from "http";
import { initSocket } from "./library/socket";

//dotenv.config();

const app = express();
app.use(express.json());

app.use(cookieParser());

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use("/api", apiRoutes);

const port = process.env.PORT || 4000;

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => console.log(`Server on http://localhost:${port}`));