import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../../src/library/prisma";
import { startServer, TestServer } from "../helpers/server";
import { addMember, as, createProject, createTask, createUser } from "../helpers/factories";

let server: TestServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server.close(); });

const api = () => request(server.http);

describe("creating projects", () => {
  it("makes the creator the owner and adds To Do / In Progress / Done lists", async () => {
    const owner = await createUser();
    const res = await api().post("/api/projects").set(as(owner)).send({ name: "  Apollo  " });

    expect(res.status).toBe(201);
    expect(res.body.project.name).toBe("Apollo");

    const member = await prisma.projectMember.findFirstOrThrow({ where: { projectId: res.body.project.id } });
    expect(member).toMatchObject({ userId: owner.id, role: "OWNER", status: "ACTIVE", stack: "fullstack" });

    const lists = await prisma.list.findMany({ where: { projectId: res.body.project.id }, orderBy: { position: "asc" } });
    expect(lists.map((l) => [l.name, l.kind])).toEqual([["To Do", "TODO"], ["In Progress", "IN_PROGRESS"], ["Done", "DONE"]]);
  });

  it("ignores a userId in the body: the owner is always the signed-in user", async () => {
    const me = await createUser();
    const victim = await createUser();
    const res = await api().post("/api/projects").set(as(me)).send({ name: "Mine", userId: victim.id });
    const owner = await prisma.projectMember.findFirstOrThrow({ where: { projectId: res.body.project.id } });
    expect(owner.userId).toBe(me.id);
  });

  it("requires a name and a session", async () => {
    const owner = await createUser();
    expect((await api().post("/api/projects").set(as(owner)).send({})).status).toBe(400);
    expect((await api().post("/api/projects").send({ name: "x" })).status).toBe(401);
  });
});

describe("reading projects", () => {
  it("lists only projects I'm an active member of", async () => {
    const me = await createUser();
    const other = await createUser();
    const mine = await createProject(me.id, "Mine");
    const invitedOnly = await createProject(other.id, "Pending for me");
    await addMember(invitedOnly.project.id, me.id, "PENDING");
    await createProject(other.id, "Not mine");

    const res = await api().get("/api/projects").set(as(me));
    expect(res.status).toBe(200);
    expect(res.body.projects.map((p: { id: string }) => p.id)).toEqual([mine.project.id]);
  });

  it("lets members open a project and refuses everyone else", async () => {
    const owner = await createUser();
    const member = await createUser();
    const outsider = await createUser();
    const { project } = await createProject(owner.id);
    await addMember(project.id, member.id);

    expect((await api().get(`/api/projects/${project.id}`).set(as(member))).status).toBe(200);
    expect((await api().get(`/api/projects/${project.id}`).set(as(outsider))).status).toBe(403);
    expect((await api().get(`/api/projects/${project.id}`)).status).toBe(401);
  });

  it("won't list another user's projects", async () => {
    const me = await createUser();
    const other = await createUser();
    expect((await api().get(`/api/projects/user/${other.id}`).set(as(me))).status).toBe(403);
    expect((await api().get(`/api/projects/user/${me.id}`).set(as(me))).status).toBe(200);
  });

  it("serves the same routes under the /api/project alias", async () => {
    const owner = await createUser();
    const { project } = await createProject(owner.id);
    expect((await api().get(`/api/project/${project.id}`).set(as(owner))).status).toBe(200);
  });
});

describe("renaming and deleting", () => {
  it("only the owner can rename", async () => {
    const owner = await createUser();
    const member = await createUser();
    const { project } = await createProject(owner.id);
    await addMember(project.id, member.id);

    expect((await api().patch(`/api/projects/${project.id}`).set(as(member)).send({ name: "Hijacked" })).status).toBe(403);
    const res = await api().patch(`/api/projects/${project.id}`).set(as(owner)).send({ name: "Renamed" });
    expect(res.status).toBe(200);
    expect(res.body.project.name).toBe("Renamed");
    expect((await api().patch(`/api/projects/${project.id}`).set(as(owner)).send({ name: "   " })).status).toBe(400);
  });

  it("only the owner can delete, and deleting removes everything in it", async () => {
    const owner = await createUser();
    const member = await createUser();
    const { project, todo } = await createProject(owner.id);
    await addMember(project.id, member.id);
    await createTask(todo.id, project.id);
    const message = await prisma.message.create({ data: { content: "hi @user", projectId: project.id, senderId: owner.id } });
    await prisma.mention.create({ data: { messageId: message.id, userId: member.id } });
    await prisma.commit.create({ data: { id: "a".repeat(40), message: "feat", projectId: project.id, authorId: owner.id } });

    expect((await api().delete(`/api/projects/${project.id}`).set(as(member))).status).toBe(403);
    expect((await api().delete(`/api/projects/${project.id}`).set(as(owner))).status).toBe(204);

    expect(await prisma.project.count({ where: { id: project.id } })).toBe(0);
    expect(await prisma.task.count({ where: { projectId: project.id } })).toBe(0);
    expect(await prisma.projectMember.count({ where: { projectId: project.id } })).toBe(0);
    expect(await prisma.message.count({ where: { projectId: project.id } })).toBe(0);
    expect(await prisma.commit.count({ where: { projectId: project.id } })).toBe(0);
  });
});
