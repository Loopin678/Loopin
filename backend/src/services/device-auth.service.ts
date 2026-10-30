import { randomBytes, randomInt } from "node:crypto";
import { issueClientToken } from "./client-token.service";
import { findUserById } from "../repositories/user.repository";

// "Sign in with Loopin" for the desktop app and CLI, modelled on OAuth's device
// authorization grant (RFC 8628), the flow `gh auth login` uses:
//   1. the app asks for a code pair and shows the short user code
//   2. the user opens the website (already signed in) and approves that code
//   3. the app polls with its long device code and receives a client token
// Pending requests live in memory: they're short-lived and a restart only
// means "start signing in again".

export const DEVICE_CODE_TTL_MS = 10 * 60 * 1000;
export const POLL_INTERVAL_S = 5;
const MAX_PENDING = 1000;
// No vowels or look-alikes (0/O, 1/I), so codes never spell words and are easy to read out
const USER_CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXZ";

type Pending = {
  deviceCode: string;
  userCode: string;
  clientName: string;
  expiresAt: number;
  intervalS: number;
  lastPolledAt: number;
  approvedBy?: string;
  denied?: boolean;
};

const byDeviceCode = new Map<string, Pending>();
const byUserCode = new Map<string, Pending>();

function purgeExpired(now = Date.now()) {
  for (const p of byDeviceCode.values()) {
    if (p.expiresAt <= now) remove(p);
  }
}

function remove(p: Pending) {
  byDeviceCode.delete(p.deviceCode);
  byUserCode.delete(p.userCode);
}

function newUserCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += USER_CODE_ALPHABET[randomInt(USER_CODE_ALPHABET.length)];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

// What people type: "wxyz1234", "WXYZ 1234" and "wxyz-1234" all mean WXYZ-1234
export function normalizeUserCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z]/g, "");
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}

export function startDeviceLogin(clientName: string) {
  purgeExpired();
  if (byDeviceCode.size >= MAX_PENDING) throw new Error("TOO_MANY_PENDING_LOGINS");

  let userCode = newUserCode();
  while (byUserCode.has(userCode)) userCode = newUserCode();

  const now = Date.now();
  const pending: Pending = {
    deviceCode: randomBytes(32).toString("base64url"),
    userCode,
    clientName: clientName.trim().slice(0, 100) || "Loopin app",
    expiresAt: now + DEVICE_CODE_TTL_MS,
    intervalS: POLL_INTERVAL_S,
    lastPolledAt: 0,
  };
  byDeviceCode.set(pending.deviceCode, pending);
  byUserCode.set(pending.userCode, pending);
  return pending;
}

function findByUserCode(userCode: string): Pending {
  purgeExpired();
  const p = byUserCode.get(normalizeUserCode(userCode));
  if (!p || p.approvedBy || p.denied) throw new Error("INVALID_USER_CODE");
  return p;
}

export function describeUserCode(userCode: string) {
  const p = findByUserCode(userCode);
  return { userCode: p.userCode, clientName: p.clientName, expiresAt: new Date(p.expiresAt).toISOString() };
}

export function approveUserCode(userCode: string, userId: string) {
  findByUserCode(userCode).approvedBy = userId;
}

export function denyUserCode(userCode: string) {
  findByUserCode(userCode).denied = true;
}

export type PollResult =
  | { status: "pending" | "slow_down" | "expired" | "denied" }
  | { status: "approved"; token: string; user: { id: string; name: string; username: string | null } };

export async function pollDeviceLogin(deviceCode: string): Promise<PollResult> {
  const now = Date.now();
  purgeExpired(now);
  const p = byDeviceCode.get(deviceCode);
  if (!p) return { status: "expired" };

  if (p.denied) {
    remove(p);
    return { status: "denied" };
  }

  if (p.approvedBy) {
    remove(p);  // the device code is single-use
    const user = await findUserById(p.approvedBy);
    if (!user) return { status: "denied" };
    const token = await issueClientToken(user.id, p.clientName);
    return { status: "approved", token, user: { id: user.id, name: user.name, username: user.username ?? null } };
  }

  // RFC 8628: polling faster than the interval earns a slow_down and a longer interval
  if (p.lastPolledAt && now - p.lastPolledAt < (p.intervalS - 1) * 1000) {
    p.intervalS += 5;
    p.lastPolledAt = now;
    return { status: "slow_down" };
  }
  p.lastPolledAt = now;
  return { status: "pending" };
}

// For tests: forget every pending login
export function resetDeviceLogins() {
  byDeviceCode.clear();
  byUserCode.clear();
}
