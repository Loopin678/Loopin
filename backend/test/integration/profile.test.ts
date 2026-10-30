import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { startServer, TestServer } from "../helpers/server";
import { addMember, as, createProject, createUser } from "../helpers/factories";

let server: TestServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server.close(); });

const api = () => request(server.http);

describe("profiles", () => {
  it("reads my own profile, including my email", async () => {
    const me = await createUser();
    const res = await api().get("/api/users/me").set(as(me));
    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({ id: me.id, username: me.username, email: me.email });
  });

  it("teammates can see each other's profile (never the email); strangers can't", async () => {
    const me = await createUser();
    const teammate = await createUser();
    const stranger = await createUser();
    const invitedOnly = await createUser();
    const { project } = await createProject(me.id);
    await addMember(project.id, teammate.id);
    await addMember(project.id, invitedOnly.id, "PENDING");

    const res = await api().get(`/api/users/${teammate.id}`).set(as(me));
    expect(res.status).toBe(200);
    expect(res.body.profile.username).toBe(teammate.username);
    expect(JSON.stringify(res.body)).not.toContain(teammate.email);

    expect((await api().get(`/api/users/${stranger.id}`).set(as(me))).status).toBe(404);
    expect((await api().get(`/api/users/${invitedOnly.id}`).set(as(me))).status).toBe(404);
  });

  it("updates name, bio and skills, cleaning them up", async () => {
    const me = await createUser();
    const res = await api().patch("/api/users/me").set(as(me))
      .send({ name: "  Grace   Hopper ", bio: "  compilers  ", skills: ["COBOL", "cobol", " Navy ", ""] });
    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({ name: "Grace Hopper", bio: "compilers", skills: ["COBOL", "Navy"] });
  });

  it("changes the username, lowercased, and refuses taken or reserved ones", async () => {
    const me = await createUser();
    const other = await createUser({ username: "taken_name" });
    void other;

    expect((await api().patch("/api/users/me").set(as(me)).send({ username: "New_Handle" })).body.profile.username).toBe("new_handle");
    expect((await api().patch("/api/users/me").set(as(me)).send({ username: "TAKEN_NAME" })).status).toBe(409);
    expect((await api().patch("/api/users/me").set(as(me)).send({ username: "ai" })).status).toBe(400);
    expect((await api().patch("/api/users/me").set(as(me)).send({ username: "no spaces!" })).status).toBe(400);
  });

  it("rejects an empty update and over-long fields", async () => {
    const me = await createUser();
    expect((await api().patch("/api/users/me").set(as(me)).send({})).status).toBe(400);
    expect((await api().patch("/api/users/me").set(as(me)).send({ bio: "x".repeat(161) })).status).toBe(400);
    expect((await api().patch("/api/users/me").set(as(me)).send({ skills: Array.from({ length: 11 }, (_, i) => `s${i}`) })).status).toBe(400);
  });

  it("requires a session", async () => {
    expect((await api().get("/api/users/me")).status).toBe(401);
  });
});
