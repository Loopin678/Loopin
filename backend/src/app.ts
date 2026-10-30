import fs from "node:fs";
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import apiRoutes from "./routes/index";
import { apiLimiter } from "./library/rateLimit";

// The Express app without a listening server, so tests can drive it directly
export function createApp(): express.Express {
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

  // For uptime checks (and the hosting script waiting for the server)
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use("/api", apiRoutes);

  // Hosting: serve the built website from the same origin as the API, so
  // cookies, CORS and sockets need no cross-site setup. SERVE_FRONTEND is the
  // path to frontend/dist (set by scripts/host/start.sh).
  const webRoot = process.env.SERVE_FRONTEND;
  if (webRoot && fs.existsSync(path.join(webRoot, "index.html"))) {
    app.use(express.static(webRoot, { index: false, maxAge: "1h" }));
    // Client-side routes (/projects/..., /connect, ...) all load the app shell
    app.get(/^(?!\/api\/|\/socket\.io\/).*/, (_req, res) => {
      res.sendFile(path.join(path.resolve(webRoot), "index.html"));
    });
  }

  return app;
}
