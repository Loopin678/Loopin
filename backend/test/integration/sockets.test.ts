import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { io as connect, Socket } from "socket.io-client";
import { prisma } from "../../src/library/prisma";
import { startServer, TestServer } from "../helpers/server";
import { addMember, as, createProject, createUser } from "../helpers/factories";

let server: TestServer;
const open: Socket[] = [];
beforeAll(async () => { server = await startServer(); });
afterEach(() => { open.splice(0).forEach((s) => s.disconnect()); });
afterAll(async () => { await server.close(); });

function client(user?: { id: string }): Socket {
  const s = connect(server.url, {
    transports: ["websocket"],
    extraHeaders: user ? as(user) : {},
    reconnection: false,
    forceNew: true,
  });
  open.push(s);
  return s;
}

function next<T = unknown>(s: Socket, event: string, ms = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out waiting for "${event}"`)), ms);
    s.once(event, (payload: T) => { clearTimeout(t); resolve(payload); });
  });
}

async function joined(s: Socket, projectId: string) {
  const snapshot = next<{ onlineUserIds: string[] }>(s, "presence:snapshot");
  s.emit("join-project", projectId);
  return snapshot;
}

describe("socket authentication", () => {
  it("refuses connections without a valid session", async () => {
    const err = await next<Error>(client(), "connect_error");
    expect(err.message).toMatch(/Authentication required/);
  });

  it("accepts a signed-in user", async () => {
    const me = await createUser();
    await next(client(me), "connect");
  });
});

describe("project rooms and presence", () => {
  it("non-members can't join a project's room", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const { project } = await createProject(owner.id);
    const s = client(outsider);
    await next(s, "connect");
    const error = next<{ message: string }>(s, "error");
    s.emit("join-project", project.id);
    expect((await error).message).toMatch(/not a member/);
  });

  it("announces who is online and when they leave", async () => {
    const owner = await createUser();
    const member = await createUser();
    const { project } = await createProject(owner.id);
    await addMember(project.id, member.id);

    const a = client(owner);
    await next(a, "connect");
    expect((await joined(a, project.id)).onlineUserIds).toEqual([owner.id]);

    const online = next<{ userId: string }>(a, "presence:online");
    const b = client(member);
    await next(b, "connect");
    const snap = await joined(b, project.id);
    expect(snap.onlineUserIds.sort()).toEqual([owner.id, member.id].sort());
    expect((await online).userId).toBe(member.id);

    const offline = next<{ userId: string }>(a, "presence:offline");
    b.disconnect();
    expect((await offline).userId).toBe(member.id);
  });

  it("broadcasts board changes to the project room", async () => {
    const owner = await createUser();
    const { project, todo } = await createProject(owner.id);
    const s = client(owner);
    await next(s, "connect");
    await joined(s, project.id);

    const created = next<{ title: string }>(s, "task:created");
    await request(server.http).post(`/api/projects/${project.id}/tasks`).set(as(owner)).send({ title: "Live", listId: todo.id });
    expect((await created).title).toBe("Live");
  });
});

describe("chat", () => {
  it("delivers messages to everyone in the project and records @mentions", async () => {
    const owner = await createUser({ username: "olivia" });
    const member = await createUser({ username: "marco" });
    const { project } = await createProject(owner.id);
    await addMember(project.id, member.id);

    const a = client(owner);
    const b = client(member);
    await Promise.all([next(a, "connect"), next(b, "connect")]);
    await joined(a, project.id);
    await joined(b, project.id);

    const received = next<{ content: string; senderId: string }>(b, "new_message");
    a.emit("send_message", { projectId: project.id, content: "hey @Marco, review please" });
    const msg = await received;
    expect(msg).toMatchObject({ content: "hey @Marco, review please", senderId: owner.id });

    const mentions = await prisma.mention.findMany({ where: { message: { projectId: project.id } } });
    expect(mentions.map((m) => m.userId)).toEqual([member.id]);
  });

  it("uses the session's identity, not one sent by the client", async () => {
    const owner = await createUser();
    const victim = await createUser();
    const { project } = await createProject(owner.id);
    await addMember(project.id, victim.id);

    const a = client(owner);
    await next(a, "connect");
    await joined(a, project.id);
    const received = next<{ senderId: string }>(a, "new_message");
    a.emit("send_message", { projectId: project.id, content: "hi", senderId: victim.id });
    expect((await received).senderId).toBe(owner.id);
  });

  it("rejects empty, over-long and non-member messages", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const { project } = await createProject(owner.id);

    const a = client(owner);
    await next(a, "connect");
    let err = next<{ error: string }>(a, "message_error");
    a.emit("send_message", { projectId: project.id, content: "   " });
    expect((await err).error).toBe("Invalid message");

    err = next<{ error: string }>(a, "message_error");
    a.emit("send_message", { projectId: project.id, content: "x".repeat(4001) });
    expect((await err).error).toBe("Invalid message");

    const o = client(outsider);
    await next(o, "connect");
    err = next<{ error: string }>(o, "message_error");
    o.emit("send_message", { projectId: project.id, content: "let me in" });
    expect((await err).error).toMatch(/not a member/);
    expect(await prisma.message.count()).toBe(0);
  });

  it("lets members read the history over HTTP", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const { project } = await createProject(owner.id);
    await prisma.message.create({ data: { content: "earlier", projectId: project.id, senderId: owner.id } });

    const res = await request(server.http).get(`/api/projects/${project.id}/messages`).set(as(owner));
    expect(res.status).toBe(200);
    expect(res.body.messages.map((m: { content: string }) => m.content)).toEqual(["earlier"]);
    expect((await request(server.http).get(`/api/projects/${project.id}/messages`).set(as(outsider))).status).toBe(403);
  });
});
