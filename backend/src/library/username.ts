// Rules for @usernames. Pure functions only: no database access.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;

// Handles people must not be able to take. "ai" matters most: in chat,
// @ai is the trigger for the AI assistant.
export const RESERVED_USERNAMES = new Set([
  "ai", "admin", "administrator", "system", "root", "support", "loopin", "api",
  "everyone", "here", "channel", "me", "you", "null", "undefined", "mod", "moderator",
]);

// Usernames are always stored lowercase, so "Arnav" and "arnav" are the same handle
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

// Takes an already-normalized username. Returns an error message, or null if it's fine.
export function validateUsername(username: string): string | null {
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Username can only contain lowercase letters, numbers and underscores";
  }
  if (RESERVED_USERNAMES.has(username)) {
    return "That username is reserved";
  }
  return null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_") // anything else becomes an underscore
    .replace(/^_+|_+$/g, "");    // no leading or trailing underscores
}

// A starting handle from a display name, falling back to the email: "Test A" -> "test_a"
export function usernameBaseFrom(name: string, email?: string): string {
  let base = slugify(name);

  if (base.length < USERNAME_MIN && email) {
    base = slugify(email.split("@")[0] ?? "");
  }
  if (base.length < USERNAME_MIN) {
    base = "user";
  }

  // Leave room for a numeric suffix (up to 4 digits) inside the 20-character limit
  return base.slice(0, USERNAME_MAX - 4).replace(/_+$/, "");
}

// First free handle: base, base2, base3, ... The "is it taken?" check is passed in,
// so this file never touches the database.
export async function pickUniqueUsername(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>
): Promise<string> {
  for (let n = 1; n <= 9999; n++) {
    const candidate = n === 1 ? base : `${base}${n}`;
    if (validateUsername(candidate) !== null) continue; // reserved, too short, ...
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error("Could not find a free username");
}