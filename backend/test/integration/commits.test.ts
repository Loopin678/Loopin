import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../../src/library/prisma";
import { startServer, TestServer } from "../helpers/server";
import { addMember, createProject, createTask, createUser } from "../helpers/factories";

// The desktop app's commit <-> task linking (POST /api/commits)

let server: TestServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server.close(); });

const api = () => request(server.http);
const SHA = "0123456789abcdef0123456789abcdef01234567";

async function setup() {
  const dev = await createUser();
  const p = await createProject(dev.id);
  const t1 = await createTask(p.todo.id, p.project.id, { title: "one" });
  const t2 = await createTask(p.todo.id, p.project.id, { title: "two" });
  return { dev, ...p, t1, t2 };
}

const report = (body: Record<string, unknown>) => api().post("/api/commits").send(body);
const linked = async () =>
  (await prisma.task.findMany({ where: { commitId: SHA }, orderBy: { title: "asc" } })).map((t) => t.title);

describe("POST /api/commits", () => {
  it("links, relinks and unlinks: taskIds is the complete set", async () => {
    const { dev, project, t1, t2 } = await setup();
    const base = { sha: SHA, message: "feat: login", projectId: project.id, authorId: dev.id };

    expect((await report({ ...base, taskIds: [t1.id, t2.id] })).status).toBe(201);
    expect(await linked()).toEqual(["one", "two"]);

    await report({ ...base, taskIds: [t2.id] });
    expect(await linked()).toEqual(["two"]);

    await report({ ...base, taskIds: [] });
    expect(await linked()).toEqual([]);
  });

  it("keeps the real commit message", async () => {
    const { dev, project } = await setup();
    await report({ sha: SHA, message: "fix: real message", projectId: project.id, authorId: dev.id, taskIds: [] });
    expect((await prisma.commit.findUniqueOrThrow({ where: { id: SHA } })).message).toBe("fix: real message");
  });

  it("ignores tasks from other projects", async () => {
    const { dev, project } = await setup();
    const other = await createProject(dev.id);
    const foreign = await createTask(other.todo.id, other.project.id);

    await report({ sha: SHA, message: "x", projectId: project.id, authorId: dev.id, taskIds: [foreign.id] });
    expect((await prisma.task.findUniqueOrThrow({ where: { id: foreign.id } })).commitId).toBeNull();
  });

  it("rejects authors who aren't active members, without creating ghost users or projects", async () => {
    const { project } = await setup();
    const pending = await createUser();
    await addMember(project.id, pending.id, "PENDING");
    const usersBefore = await prisma.user.count();
    const projectsBefore = await prisma.project.count();

    expect((await report({ sha: SHA, message: "x", projectId: project.id, authorId: pending.id })).status).toBe(403);
    expect((await report({ sha: SHA, message: "x", projectId: project.id, authorId: "no-such-user" })).status).toBe(403);
    expect((await report({ sha: SHA, message: "x", projectId: "no-such-project", authorId: pending.id })).status).toBe(403);

    expect(await prisma.user.count()).toBe(usersBefore);
    expect(await prisma.project.count()).toBe(projectsBefore);
  });

  it("validates the sha and taskIds", async () => {
    const { dev, project } = await setup();
    const base = { message: "x", projectId: project.id, authorId: dev.id };
    expect((await report({ ...base, sha: "not a sha" })).status).toBe(400);
    expect((await report({ ...base, sha: SHA, taskIds: "t1" })).status).toBe(400);
    expect((await report({ sha: SHA, projectId: project.id, authorId: dev.id })).status).toBe(400);
  });

  it("is listed with its tasks for the desktop app", async () => {
    const { dev, project, t1 } = await setup();
    await report({ sha: SHA, message: "feat", projectId: project.id, authorId: dev.id, taskIds: [t1.id] });
    const res = await api().get(`/api/projects/${project.id}/commits`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([expect.objectContaining({ id: SHA, tasks: [{ id: t1.id, title: "one" }] })]);
  });
});
