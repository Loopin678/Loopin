import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { prisma } from "../../src/library/prisma";
import { resetDeviceLogins } from "../../src/services/device-auth.service";
import { startServer, TestServer } from "../helpers/server";
import { addMember, as, createProject, createTask, createUser } from "../helpers/factories";

// "Sign in with Loopin" for the desktop app and CLI

let server: TestServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server.close(); });
beforeEach(() => resetDeviceLogins());
afterEach(() => vi.useRealTimers());

const api = () => request(server.http);

async function start(clientName = "Loopin Desktop on test-laptop") {
  const res = await api().post("/api/auth/device").send({ clientName });
  expect(res.status).toBe(200);
  return res.body as { deviceCode: string; userCode: string; verificationUri: string; verificationUriComplete: string; interval: number };
}
const poll = (deviceCode: string) => api().post("/api/auth/device/token").send({ deviceCode });

// Signs `user` in through the whole flow and returns the app's token
async function signInApp(user: { id: string }) {
  const { deviceCode, userCode } = await start();
  await api().post("/api/auth/device/approve").set(as(user)).send({ userCode });
  const res = await poll(deviceCode);
  expect(res.status).toBe(200);
  return res.body.token as string;
}
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("the device sign-in flow", () => {
  it("issues a short readable code and a link to the website", async () => {
    const body = await start();
    expect(body.userCode).toMatch(/^[BCDFGHJKLMNPQRSTVWXZ]{4}-[BCDFGHJKLMNPQRSTVWXZ]{4}$/);
    expect(body.deviceCode.length).toBeGreaterThan(30);
    expect(body.verificationUri).toMatch(/\/connect$/);
    expect(body.verificationUriComplete).toBe(`${body.verificationUri}?code=${body.userCode}`);
  });

  it("is pending until approved, then hands out a token exactly once", async () => {
    const me = await createUser();
    const { deviceCode, userCode } = await start();

    expect((await poll(deviceCode)).body.error).toBe("authorization_pending");

    const shown = await api().get(`/api/auth/device/${userCode.toLowerCase().replace("-", "")}`).set(as(me));
    expect(shown.status).toBe(200);
    expect(shown.body.clientName).toBe("Loopin Desktop on test-laptop");

    expect((await api().post("/api/auth/device/approve").set(as(me)).send({ userCode })).status).toBe(200);

    const done = await poll(deviceCode);
    expect(done.status).toBe(200);
    expect(done.body.token).toMatch(/^lpn_/);
    expect(done.body.user).toMatchObject({ id: me.id, username: me.username });

    // The device code is single-use
    expect((await poll(deviceCode)).body.error).toBe("expired_token");
  });

  it("stores only a hash of the token", async () => {
    const me = await createUser();
    const token = await signInApp(me);
    const row = await prisma.clientToken.findFirstOrThrow({ where: { userId: me.id } });
    expect(row.tokenHash).not.toContain(token);
    expect(JSON.stringify(row)).not.toContain(token);
  });

  it("tells the app when the user declines", async () => {
    const me = await createUser();
    const { deviceCode, userCode } = await start();
    await api().post("/api/auth/device/deny").set(as(me)).send({ userCode });
    expect((await poll(deviceCode)).body.error).toBe("access_denied");
  });

  it("asks a client that polls too fast to slow down", async () => {
    const { deviceCode } = await start();
    await poll(deviceCode);
    expect((await poll(deviceCode)).body.error).toBe("slow_down");
  });

  it("expires codes after 10 minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const me = await createUser();
    const { deviceCode, userCode } = await start();
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);

    expect((await api().post("/api/auth/device/approve").set(as(me)).send({ userCode })).status).toBe(404);
    expect((await poll(deviceCode)).body.error).toBe("expired_token");
  });

  it("only a website session can approve, not anonymous users or another app's token", async () => {
    const me = await createUser();
    const appToken = await signInApp(me);
    const { userCode } = await start();

    expect((await api().post("/api/auth/device/approve").send({ userCode })).status).toBe(401);
    expect((await api().post("/api/auth/device/approve").set(bearer(appToken)).send({ userCode })).status).toBe(403);
  });

  it("rejects unknown codes", async () => {
    const me = await createUser();
    expect((await api().post("/api/auth/device/approve").set(as(me)).send({ userCode: "BCDF-GHJK" })).status).toBe(404);
    expect((await poll("not-a-device-code")).body.error).toBe("expired_token");
  });
});

describe("using an app token", () => {
  it("works as a Bearer token on the API, as the user who approved it", async () => {
    const me = await createUser();
    const token = await signInApp(me);
    const res = await api().get("/api/auth/me").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(me.id);
  });

  it("gives the desktop app what it needs: tasks and commits of my projects only", async () => {
    const me = await createUser();
    const { project, todo } = await createProject(me.id);
    await createTask(todo.id, project.id, { title: "Desktop sees this" });
    const otherOwner = await createUser();
    const other = await createProject(otherOwner.id);
    const token = await signInApp(me);

    const tasks = await api().get(`/api/projects/${project.id}/tasks`).set(bearer(token));
    expect(tasks.status).toBe(200);
    expect(tasks.body.map((t: { title: string }) => t.title)).toEqual(["Desktop sees this"]);
    expect((await api().get(`/api/projects/${project.id}/commits`).set(bearer(token))).status).toBe(200);

    expect((await api().get(`/api/projects/${other.project.id}/tasks`).set(bearer(token))).status).toBe(403);
    // Previously open to anyone with a project id
    expect((await api().get(`/api/projects/${project.id}/tasks`)).status).toBe(401);
  });

  it("links commits as the token's user", async () => {
    const me = await createUser();
    const { project, todo } = await createProject(me.id);
    const task = await createTask(todo.id, project.id);
    await addMember(project.id, (await createUser()).id);
    const token = await signInApp(me);

    const res = await api().post("/api/commits").set(bearer(token))
      .send({ sha: "a".repeat(40), message: "feat: x", projectId: project.id, taskIds: [task.id] });
    expect(res.status).toBe(201);
    expect((await prisma.commit.findUniqueOrThrow({ where: { id: "a".repeat(40) } })).authorId).toBe(me.id);
  });
});

describe("managing signed-in apps", () => {
  it("lists my apps (never the token) and revokes one", async () => {
    const me = await createUser();
    const token = await signInApp(me);

    const list = await api().get("/api/auth/tokens").set(as(me));
    expect(list.status).toBe(200);
    expect(list.body.tokens).toEqual([expect.objectContaining({ name: "Loopin Desktop on test-laptop" })]);
    expect(JSON.stringify(list.body)).not.toContain(token);

    expect((await api().delete(`/api/auth/tokens/${list.body.tokens[0].id}`).set(as(me))).status).toBe(204);
    const after = await api().get("/api/auth/me").set(bearer(token));
    expect(after.status).toBe(401);
    expect(after.body.message).toMatch(/sign in again/i);
    expect((await api().get("/api/auth/tokens").set(as(me))).body.tokens).toEqual([]);
  });

  it("an app can sign itself out", async () => {
    const me = await createUser();
    const token = await signInApp(me);
    expect((await api().delete("/api/auth/tokens/current").set(bearer(token))).status).toBe(204);
    expect((await api().get("/api/auth/me").set(bearer(token))).status).toBe(401);
  });

  it("can't revoke someone else's app, or manage apps with an app token", async () => {
    const me = await createUser();
    const attacker = await createUser();
    await signInApp(me);
    const attackerApp = await signInApp(attacker);
    const myTokenId = (await prisma.clientToken.findFirstOrThrow({ where: { userId: me.id } })).id;

    expect((await api().delete(`/api/auth/tokens/${myTokenId}`).set(as(attacker))).status).toBe(404);
    expect((await api().get("/api/auth/tokens").set(bearer(attackerApp))).status).toBe(403);
    expect((await prisma.clientToken.findUniqueOrThrow({ where: { id: myTokenId } })).revokedAt).toBeNull();
  });

  it("a garbage lpn_ token is rejected", async () => {
    expect((await api().get("/api/auth/me").set(bearer("lpn_nonsense"))).status).toBe(401);
  });
});
