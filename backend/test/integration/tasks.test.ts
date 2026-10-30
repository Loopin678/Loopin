import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../../src/library/prisma";
import { startServer, TestServer } from "../helpers/server";
import { addMember, as, createProject, createTask, createUser } from "../helpers/factories";

let server: TestServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server.close(); });

const api = () => request(server.http);

async function board() {
  const owner = await createUser();
  const member = await createUser();
  const outsider = await createUser();
  const p = await createProject(owner.id);
  await addMember(p.project.id, member.id);
  return { owner, member, outsider, ...p };
}

const positions = async (listId: string) =>
  (await prisma.task.findMany({ where: { listId }, orderBy: { position: "asc" }, select: { title: true, position: true } }))
    .map((t) => `${t.position}:${t.title}`);

describe("lists", () => {
  it("members read lists with their tasks; outsiders and anonymous users can't", async () => {
    const { project, member, outsider, todo } = await board();
    await createTask(todo.id, project.id, { title: "First" });

    const res = await api().get(`/api/projects/${project.id}/lists`).set(as(member));
    expect(res.status).toBe(200);
    expect(res.body.lists.map((l: { name: string }) => l.name)).toEqual(["To Do", "In Progress", "Done"]);
    expect(res.body.lists[0].tasks[0].title).toBe("First");

    expect((await api().get(`/api/projects/${project.id}/lists`).set(as(outsider))).status).toBe(403);
    expect((await api().get(`/api/projects/${project.id}/lists`)).status).toBe(401);
  });

  it("creates and renames lists, rejecting duplicate names", async () => {
    const { project, member, todo } = await board();
    const created = await api().post(`/api/projects/${project.id}/lists`).set(as(member)).send({ name: "QA" });
    expect(created.status).toBe(201);
    expect(created.body.list.kind).toBe("CUSTOM");

    expect((await api().post(`/api/projects/${project.id}/lists`).set(as(member)).send({ name: "QA" })).status).toBe(409);
    expect((await api().patch(`/api/projects/${project.id}/lists/${todo.id}`).set(as(member)).send({ name: "QA" })).status).toBe(409);

    const renamed = await api().patch(`/api/projects/${project.id}/lists/${todo.id}`).set(as(member)).send({ name: "Backlog" });
    expect(renamed.status).toBe(200);
    // Renaming never changes what the list means
    expect((await prisma.list.findUniqueOrThrow({ where: { id: todo.id } })).kind).toBe("TODO");
  });
});

describe("creating tasks", () => {
  it("needs a session (regression: the merge left this route open, then always 401'd)", async () => {
    const { project, todo } = await board();
    expect((await api().post(`/api/projects/${project.id}/tasks`).send({ title: "x", listId: todo.id })).status).toBe(401);
  });

  it("creates a task with priority and due date at the end of the list", async () => {
    const { project, member, todo } = await board();
    await createTask(todo.id, project.id);
    const res = await api().post(`/api/projects/${project.id}/tasks`).set(as(member))
      .send({ title: "Ship it", listId: todo.id, priority: "high", dueDate: "2026-12-01" });

    expect(res.status).toBe(201);
    expect(res.body.task).toMatchObject({ title: "Ship it", priority: "high", dueDate: "2026-12-01", position: 1 });
  });

  it("defaults priority to medium", async () => {
    const { project, member, todo } = await board();
    const res = await api().post(`/api/projects/${project.id}/tasks`).set(as(member)).send({ title: "x", listId: todo.id });
    expect(res.body.task.priority).toBe("medium");
  });

  it("only assigns active members of the same project", async () => {
    const { project, member, outsider, todo } = await board();
    const pending = await createUser();
    await addMember(project.id, pending.id, "PENDING");
    const create = (assigneeId: string) =>
      api().post(`/api/projects/${project.id}/tasks`).set(as(member)).send({ title: "x", listId: todo.id, assigneeId });

    expect((await create(outsider.id)).status).toBe(400);
    expect((await create(pending.id)).status).toBe(400);
    expect((await create(member.id)).status).toBe(201);
  });

  it("can't put a task into another project's list", async () => {
    const { member } = await board();
    const other = await createUser();
    const foreign = await createProject(other.id);
    const mine = await createProject(member.id);
    const res = await api().post(`/api/projects/${mine.project.id}/tasks`).set(as(member))
      .send({ title: "sneaky", listId: foreign.todo.id });
    expect(res.status).toBe(403);
    expect(await prisma.task.count({ where: { projectId: foreign.project.id } })).toBe(0);
  });
});

describe("reading, updating and deleting tasks", () => {
  it("members read and update; outsiders get 403", async () => {
    const { project, member, outsider, todo } = await board();
    const task = await createTask(todo.id, project.id, { title: "Old" });

    expect((await api().get(`/api/tasks/${task.id}`).set(as(outsider))).status).toBe(403);
    expect((await api().patch(`/api/tasks/${task.id}`).set(as(outsider)).send({ title: "Hacked" })).status).toBe(403);

    const res = await api().patch(`/api/tasks/${task.id}`).set(as(member)).send({ title: "New", priority: "low", assigneeId: member.id });
    expect(res.status).toBe(200);
    expect(res.body.task).toMatchObject({ title: "New", priority: "low", assigneeId: member.id });
  });

  it("task details don't expose the assignee's email", async () => {
    const { project, member, todo } = await board();
    const task = await createTask(todo.id, project.id, { assigneeId: member.id });
    const res = await api().get(`/api/tasks/${task.id}`).set(as(member));
    expect(res.body.task.assignee).toMatchObject({ id: member.id, name: member.name, username: member.username });
    expect(JSON.stringify(res.body)).not.toContain(member.email);
  });

  it("404s for a task that doesn't exist", async () => {
    const { member } = await board();
    expect((await api().get("/api/tasks/00000000-0000-0000-0000-000000000000").set(as(member))).status).toBe(404);
  });

  it("deletes a task", async () => {
    const { project, member, todo } = await board();
    const task = await createTask(todo.id, project.id);
    expect((await api().delete(`/api/tasks/${task.id}`).set(as(member))).status).toBe(200);
    expect(await prisma.task.count({ where: { id: task.id } })).toBe(0);
  });
});

describe("moving tasks", () => {
  it("reorders within a list, keeping positions 0..n-1", async () => {
    const { project, member, todo } = await board();
    const a = await createTask(todo.id, project.id, { title: "A" });
    await createTask(todo.id, project.id, { title: "B" });
    await createTask(todo.id, project.id, { title: "C" });

    const res = await api().patch(`/api/tasks/${a.id}/move`).set(as(member)).send({ newListId: todo.id, newPosition: 2 });
    expect(res.status).toBe(200);
    expect(await positions(todo.id)).toEqual(["0:B", "1:C", "2:A"]);
  });

  it("moves between lists and closes the gap it left", async () => {
    const { project, member, todo, inProgress } = await board();
    await createTask(todo.id, project.id, { title: "A" });
    const b = await createTask(todo.id, project.id, { title: "B" });
    await createTask(todo.id, project.id, { title: "C" });
    await createTask(inProgress.id, project.id, { title: "X" });

    await api().patch(`/api/tasks/${b.id}/move`).set(as(member)).send({ newListId: inProgress.id, newPosition: 0 });
    expect(await positions(todo.id)).toEqual(["0:A", "1:C"]);
    expect(await positions(inProgress.id)).toEqual(["0:B", "1:X"]);
  });

  it("clamps out-of-range positions to the end", async () => {
    const { project, member, todo, done } = await board();
    const a = await createTask(todo.id, project.id, { title: "A" });
    await createTask(done.id, project.id, { title: "D" });
    await api().patch(`/api/tasks/${a.id}/move`).set(as(member)).send({ newListId: done.id, newPosition: 999 });
    expect(await positions(done.id)).toEqual(["0:D", "1:A"]);
  });

  it("refuses to move a task into another project's list", async () => {
    const { project, member, todo } = await board();
    const task = await createTask(todo.id, project.id);
    const foreign = await createProject(member.id);
    const res = await api().patch(`/api/tasks/${task.id}/move`).set(as(member)).send({ newListId: foreign.todo.id, newPosition: 0 });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).listId).toBe(todo.id);
  });
});

describe("GET /api/tasks/mine", () => {
  it("lists my tasks across projects, hiding Done and projects I've left", async () => {
    const me = await createUser();
    const a = await createProject(me.id, "Alpha");
    const otherOwner = await createUser();
    const b = await createProject(otherOwner.id, "Beta");
    const left = await createProject(otherOwner.id, "Left");
    await addMember(b.project.id, me.id);

    await createTask(a.todo.id, a.project.id, { title: "alpha todo", assigneeId: me.id });
    await createTask(a.done.id, a.project.id, { title: "alpha done", assigneeId: me.id });
    await createTask(b.inProgress.id, b.project.id, { title: "beta wip", assigneeId: me.id });
    await createTask(b.todo.id, b.project.id, { title: "someone else's", assigneeId: otherOwner.id });
    // Stale assignment in a project I'm no longer in
    await createTask(left.todo.id, left.project.id, { title: "stale", assigneeId: me.id });

    const res = await api().get("/api/tasks/mine").set(as(me));
    expect(res.status).toBe(200);
    expect(res.body.tasks.map((t: { title: string }) => t.title).sort()).toEqual(["alpha todo", "beta wip"]);

    const withDone = await api().get("/api/tasks/mine?includeDone=true").set(as(me));
    expect(withDone.body.tasks).toHaveLength(3);
  });
});
