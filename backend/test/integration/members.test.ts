import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../../src/library/prisma";
import { startServer, TestServer } from "../helpers/server";
import { addMember, as, createProject, createTask, createUser } from "../helpers/factories";

let server: TestServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server.close(); });

const api = () => request(server.http);

async function team() {
  const owner = await createUser();
  const member = await createUser();
  const outsider = await createUser();
  const p = await createProject(owner.id);
  await addMember(p.project.id, member.id);
  return { owner, member, outsider, ...p };
}

describe("inviting", () => {
  it("the owner invites by email; the invite is a PENDING membership", async () => {
    const { owner, outsider, project } = await team();
    const res = await api().post(`/api/project/member/${project.id}`).set(as(owner))
      .send({ email: outsider.email.toUpperCase(), stack: "backend" });

    expect(res.status).toBe(201);
    const row = await prisma.projectMember.findUniqueOrThrow({
      where: { userId_projectId: { userId: outsider.id, projectId: project.id } },
    });
    expect(row).toMatchObject({ status: "PENDING", role: "MEMBER", stack: "backend" });
  });

  it("refuses non-owners, unknown emails and duplicates", async () => {
    const { owner, member, outsider, project } = await team();
    const invite = (by: { id: string }, email: string) =>
      api().post(`/api/project/member/${project.id}`).set(as(by)).send({ email, stack: "x" });

    expect((await invite(member, outsider.email)).status).toBe(403);
    expect((await invite(owner, "nobody@example.test")).status).toBe(404);
    expect((await invite(owner, member.email)).status).toBe(409);
    expect((await invite(owner, outsider.email)).status).toBe(201);
    expect((await invite(owner, outsider.email)).status).toBe(409);
  });

  it("an invited user can't see the project yet", async () => {
    const { owner, outsider, project } = await team();
    await addMember(project.id, outsider.id, "PENDING");
    expect((await api().get(`/api/projects/${project.id}`).set(as(outsider))).status).toBe(403);
    void owner;
  });
});

describe("responding to invites", () => {
  it("lists my pending invites (route isn't captured by the /project alias)", async () => {
    const { project, outsider } = await team();
    await addMember(project.id, outsider.id, "PENDING");

    const res = await api().get("/api/project/member/invites").set(as(outsider));
    expect(res.status).toBe(200);
    expect(res.body.invitations).toHaveLength(1);
    expect(res.body.invitations[0].project.id).toBe(project.id);
  });

  it("accepting makes me an active member", async () => {
    const { project, outsider } = await team();
    await addMember(project.id, outsider.id, "PENDING");

    expect((await api().post(`/api/project/member/${project.id}/accept`).set(as(outsider))).status).toBe(200);
    expect((await api().get(`/api/projects/${project.id}`).set(as(outsider))).status).toBe(200);
    // Accepting twice is not a thing
    expect((await api().post(`/api/project/member/${project.id}/accept`).set(as(outsider))).status).toBe(404);
  });

  it("declining removes the invite", async () => {
    const { project, outsider } = await team();
    await addMember(project.id, outsider.id, "PENDING");
    expect((await api().post(`/api/project/member/${project.id}/decline`).set(as(outsider))).status).toBe(200);
    expect(await prisma.projectMember.count({ where: { projectId: project.id, userId: outsider.id } })).toBe(0);
  });

  it("can't accept an invite that was never sent", async () => {
    const { project, outsider } = await team();
    expect((await api().post(`/api/project/member/${project.id}/accept`).set(as(outsider))).status).toBe(404);
  });

  it("members see the project's outgoing invites; outsiders don't", async () => {
    const { project, member, outsider } = await team();
    const invited = await createUser();
    await addMember(project.id, invited.id, "PENDING");

    const res = await api().get(`/api/project/member/${project.id}/invites`).set(as(member));
    expect(res.status).toBe(200);
    expect(res.body.invitations).toHaveLength(1);
    expect((await api().get(`/api/project/member/${project.id}/invites`).set(as(outsider))).status).toBe(403);
  });
});

describe("listing members", () => {
  it("members see each other but not email addresses", async () => {
    const { project, member, outsider } = await team();
    const res = await api().get(`/api/project/member/${project.id}`).set(as(member));
    expect(res.status).toBe(200);
    expect(res.body.members).toHaveLength(2);
    expect(JSON.stringify(res.body.members)).not.toMatch(/@example\.test/);
    expect((await api().get(`/api/project/member/${project.id}`).set(as(outsider))).status).toBe(403);
  });
});

describe("removing members", () => {
  it("a member can leave; their task assignments are cleared", async () => {
    const { project, member, todo } = await team();
    const task = await createTask(todo.id, project.id, { assigneeId: member.id });

    expect((await api().delete(`/api/project/member/${project.id}/${member.id}`).set(as(member))).status).toBe(204);
    expect(await prisma.projectMember.count({ where: { projectId: project.id, userId: member.id } })).toBe(0);
    expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).assigneeId).toBeNull();
  });

  it("a member can't remove someone else", async () => {
    const { project, owner, member } = await team();
    const other = await createUser();
    await addMember(project.id, other.id);
    expect((await api().delete(`/api/project/member/${project.id}/${other.id}`).set(as(member))).status).toBe(403);
    expect((await api().delete(`/api/project/member/${project.id}/${owner.id}`).set(as(member))).status).toBe(403);
  });

  it("the owner can remove members and revoke invites, but not themselves", async () => {
    const { project, owner, member } = await team();
    const invited = await createUser();
    await addMember(project.id, invited.id, "PENDING");

    expect((await api().delete(`/api/project/member/${project.id}/${member.id}`).set(as(owner))).status).toBe(204);
    expect((await api().delete(`/api/project/member/${project.id}/${invited.id}`).set(as(owner))).status).toBe(204);
    expect((await api().delete(`/api/project/member/${project.id}/${owner.id}`).set(as(owner))).status).toBe(403);
  });
});

describe("transferring ownership", () => {
  it("the owner hands over to an active member and becomes a member", async () => {
    const { project, owner, member } = await team();
    const res = await api().patch(`/api/project/member/${project.id}/transfer-owner`).set(as(owner)).send({ newOwnerId: member.id });
    expect(res.status).toBe(200);

    const roles = await prisma.projectMember.findMany({ where: { projectId: project.id }, select: { userId: true, role: true } });
    expect(roles.find((r) => r.userId === member.id)!.role).toBe("OWNER");
    expect(roles.find((r) => r.userId === owner.id)!.role).toBe("MEMBER");
  });

  it("refuses non-owners, pending members and self-transfer, changing nothing", async () => {
    const { project, owner, member } = await team();
    const other = await createUser();
    await addMember(project.id, other.id);
    const invited = await createUser();
    await addMember(project.id, invited.id, "PENDING");
    const transfer = (by: { id: string }, to: string) =>
      api().patch(`/api/project/member/${project.id}/transfer-owner`).set(as(by)).send({ newOwnerId: to });

    expect((await transfer(member, other.id)).status).toBe(403);
    expect((await transfer(member, owner.id)).status).toBe(403);
    expect((await transfer(owner, invited.id)).status).toBe(400);
    expect((await transfer(owner, owner.id)).status).toBe(400);

    const owners = await prisma.projectMember.findMany({ where: { projectId: project.id, role: "OWNER" } });
    expect(owners.map((o) => o.userId)).toEqual([owner.id]);
  });
});
