import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/repositories/project-member.repository", () => ({ findProjectMember: vi.fn() }));

import { findProjectMember } from "../../src/repositories/project-member.repository";
import { assertActiveMember, assertProjectOwner, assertValidAssignee } from "../../src/services/access.service";

const lookup = vi.mocked(findProjectMember);
const row = (status: "ACTIVE" | "PENDING", role: "OWNER" | "MEMBER") => ({ status, role }) as never;

beforeEach(() => lookup.mockReset());

describe("assertActiveMember", () => {
  it("passes active members through", async () => {
    lookup.mockResolvedValue(row("ACTIVE", "MEMBER"));
    await expect(assertActiveMember("p", "u")).resolves.toMatchObject({ status: "ACTIVE" });
  });

  it.each([[null], [row("PENDING", "MEMBER")]])("rejects non-members and pending invites (%#)", async (r) => {
    lookup.mockResolvedValue(r as never);
    await expect(assertActiveMember("p", "u")).rejects.toThrow("FORBIDDEN_NOT_PROJECT_MEMBER");
  });
});

describe("assertProjectOwner", () => {
  it("passes the active owner", async () => {
    lookup.mockResolvedValue(row("ACTIVE", "OWNER"));
    await expect(assertProjectOwner("p", "u")).resolves.toBeTruthy();
  });

  it("rejects members and a pending 'owner'", async () => {
    lookup.mockResolvedValue(row("ACTIVE", "MEMBER"));
    await expect(assertProjectOwner("p", "u")).rejects.toThrow("FORBIDDEN_NOT_PROJECT_OWNER");
    lookup.mockResolvedValue(row("PENDING", "OWNER"));
    await expect(assertProjectOwner("p", "u")).rejects.toThrow("FORBIDDEN_NOT_PROJECT_MEMBER");
  });
});

describe("assertValidAssignee", () => {
  it("only accepts active members as assignees", async () => {
    lookup.mockResolvedValue(row("ACTIVE", "MEMBER"));
    await expect(assertValidAssignee("p", "u")).resolves.toBeUndefined();
    lookup.mockResolvedValue(row("PENDING", "MEMBER"));
    await expect(assertValidAssignee("p", "u")).rejects.toThrow("ASSIGNEE_NOT_PROJECT_MEMBER");
  });
});
