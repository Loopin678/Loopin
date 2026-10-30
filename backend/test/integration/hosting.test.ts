import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { createApp } from "../../src/app";

// Serving the built website from the backend (single-origin hosting)

let webRoot: string;
beforeAll(() => {
  webRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loopin-web-"));
  fs.writeFileSync(path.join(webRoot, "index.html"), "<!doctype html><title>Loopin app shell</title>");
  fs.mkdirSync(path.join(webRoot, "assets"));
  fs.writeFileSync(path.join(webRoot, "assets", "app.js"), "console.log('app')");
});
afterAll(() => fs.rmSync(webRoot, { recursive: true, force: true }));

function appServingWebsite() {
  vi.stubEnv("SERVE_FRONTEND", webRoot);
  const app = createApp();
  vi.unstubAllEnvs();
  return app;
}

describe("hosting", () => {
  it("answers the health check", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("serves the app shell for client-side routes, and static assets", async () => {
    const app = appServingWebsite();
    for (const route of ["/", "/projects/abc", "/connect?code=WXYZ-BCDF"]) {
      const res = await request(app).get(route);
      expect(res.status).toBe(200);
      expect(res.text).toContain("Loopin app shell");
    }
    expect((await request(app).get("/assets/app.js")).text).toContain("console.log");
  });

  it("never answers API routes with the app shell", async () => {
    const res = await request(appServingWebsite()).get("/api/does-not-exist");
    expect(res.text).not.toContain("Loopin app shell");
  });

  it("serves no website when SERVE_FRONTEND isn't set", async () => {
    expect((await request(createApp()).get("/projects/abc")).status).toBe(404);
  });
});

describe("JWT secret in production", () => {
  it("refuses to start with the development fallback secret", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "");
    await expect(import("../../src/library/auth")).rejects.toThrow(/JWT_SECRET must be set/);
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
