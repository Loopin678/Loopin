import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { prisma } from "../../src/library/prisma";
import { startServer, TestServer } from "../helpers/server";
import { as, createUser, PASSWORD } from "../helpers/factories";

let server: TestServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server.close(); });

const api = () => request(server.http);

describe("POST /api/auth/register", () => {
  it("creates the account with a hashed password and an @username", async () => {
    const res = await api().post("/api/auth/register")
      .send({ name: "Ada Lovelace", email: "  Ada@Example.Test ", password: "analytical-engine" });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: "Ada Lovelace", email: "ada@example.test" });
    expect(res.body.user.password).toBeUndefined();

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: "ada@example.test" } });
    expect(stored.password).not.toBe("analytical-engine");
    expect(stored.username).toMatch(/^[a-z0-9_]{3,20}$/);
  });

  it("rejects missing fields and short passwords", async () => {
    expect((await api().post("/api/auth/register").send({ email: "a@b.test", password: "longenough" })).status).toBe(400);
    expect((await api().post("/api/auth/register").send({ name: "A", email: "a@b.test", password: "short" })).status).toBe(400);
  });

  it("rejects a duplicate email regardless of case", async () => {
    await createUser({ email: "taken@example.test" });
    const res = await api().post("/api/auth/register")
      .send({ name: "Other", email: "TAKEN@example.test", password: "longenough" });
    expect(res.status).toBe(409);
  });

  it("gives two people with the same name different usernames", async () => {
    for (const email of ["sam1@example.test", "sam2@example.test"]) {
      expect((await api().post("/api/auth/register").send({ name: "Sam Lee", email, password: "longenough" })).status).toBe(201);
    }
    const users = await prisma.user.findMany({ where: { name: "Sam Lee" }, select: { username: true } });
    expect(new Set(users.map((u) => u.username)).size).toBe(2);
  });
});

describe("POST /api/auth/login", () => {
  it("sets an httpOnly auth cookie for the right password", async () => {
    const user = await createUser({ email: "login@example.test" });
    const res = await api().post("/api/auth/login").send({ email: "LOGIN@example.test", password: PASSWORD });

    expect(res.status).toBe(200);
    const cookie = [res.headers["set-cookie"]].flat().join(";");
    expect(cookie).toMatch(/auth_token=/);
    expect(cookie).toMatch(/HttpOnly/i);

    const token = cookie.match(/auth_token=([^;]+)/)![1];
    expect((jwt.decode(token) as { userId: string }).userId).toBe(user.id);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    await createUser({ email: "known@example.test" });
    const wrong = await api().post("/api/auth/login").send({ email: "known@example.test", password: "nope-nope-nope" });
    const unknown = await api().post("/api/auth/login").send({ email: "nobody@example.test", password: "nope-nope-nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the signed-in user", async () => {
    const user = await createUser();
    const res = await api().get("/api/auth/me").set(as(user));
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it("accepts the token as a Bearer header too", async () => {
    const user = await createUser();
    const token = as(user).Cookie.replace("auth_token=", "");
    expect((await api().get("/api/auth/me").set("Authorization", `Bearer ${token}`)).status).toBe(200);
  });

  it("rejects missing, forged and expired tokens", async () => {
    const user = await createUser();
    expect((await api().get("/api/auth/me")).status).toBe(401);

    const forged = jwt.sign({ userId: user.id }, "not-the-server-secret");
    expect((await api().get("/api/auth/me").set("Cookie", `auth_token=${forged}`)).status).toBe(401);

    const expired = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: -10 });
    expect((await api().get("/api/auth/me").set("Cookie", `auth_token=${expired}`)).status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the auth cookie", async () => {
    const res = await api().post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect([res.headers["set-cookie"]].flat().join(";")).toMatch(/auth_token=;/);
  });
});
