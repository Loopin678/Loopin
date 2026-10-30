import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import apiRoutes from "./routes/index";
import { createServer } from "http";
import { initSocket } from "./library/socket";
import { apiLimiter } from "./library/rateLimit";

const app = express();

// Behind Render/Railway/Fly there is one proxy in front of us. Without this every
// user looks like the same IP and shares one limit. Set NODE_ENV=production on the host.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(express.json());
app.use(cookieParser());

app.use(cors({
  // FRONTEND_URL in production; reflect the request origin in local dev
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
}));

app.use("/api", apiLimiter);

app.use("/api", apiRoutes);

const port = process.env.PORT || 3000;

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => console.log(`Server on http://localhost:${port}`));