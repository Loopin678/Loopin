import { describe, expect, it } from "vitest";
import { normalizeUsername, pickUniqueUsername, usernameBaseFrom, validateUsername } from "../../src/library/username";

describe("validateUsername", () => {
  it.each(["abc", "ada_lovelace", "user123", "a".repeat(20)])("accepts %s", (u) => {
    expect(validateUsername(u)).toBeNull();
  });

  it.each([
    ["ab", /3-20/],
    ["a".repeat(21), /3-20/],
    ["Has-Caps", /lowercase/],
    ["with space", /lowercase/],
    ["ai", /3-20|reserved/],
    ["admin", /reserved/],
    ["everyone", /reserved/],
  ])("rejects %s", (u, why) => {
    expect(validateUsername(u)).toMatch(why);
  });
});

describe("normalizeUsername", () => {
  it("trims and lowercases, so @Arnav and @arnav are the same handle", () => {
    expect(normalizeUsername("  Arnav ")).toBe("arnav");
  });
});

describe("usernameBaseFrom", () => {
  it("slugifies the display name", () => {
    expect(usernameBaseFrom("Test A")).toBe("test_a");
    expect(usernameBaseFrom("  José  María ")).toBe("jos_mar_a");
  });

  it("falls back to the email, then to 'user'", () => {
    expect(usernameBaseFrom("李", "wei.zhang@example.com")).toBe("wei_zhang");
    expect(usernameBaseFrom("!!", "x@y.z")).toBe("user");
  });

  it("leaves room for a numeric suffix", () => {
    const base = usernameBaseFrom("a very long display name indeed");
    expect(base.length).toBeLessThanOrEqual(16);
    expect(base.endsWith("_")).toBe(false);
  });
});

describe("pickUniqueUsername", () => {
  it("returns the base when it's free", async () => {
    expect(await pickUniqueUsername("grace", async () => false)).toBe("grace");
  });

  it("appends the first free number", async () => {
    const taken = new Set(["grace", "grace2", "grace3"]);
    expect(await pickUniqueUsername("grace", async (c) => taken.has(c))).toBe("grace4");
  });

  it("skips reserved candidates instead of handing them out", async () => {
    expect(await pickUniqueUsername("admin", async () => false)).toBe("admin2");
  });
});
