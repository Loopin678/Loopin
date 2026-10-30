import { Request, Response } from "express";
import {
  approveUserCode, denyUserCode, describeUserCode, DEVICE_CODE_TTL_MS, pollDeviceLogin, startDeviceLogin,
} from "../services/device-auth.service";
import { listClientTokens, revokeClientToken } from "../services/client-token.service";

// Where people approve the code: the website. PUBLIC_URL or FRONTEND_URL when
// hosted, otherwise whatever host the request came in on.
function websiteBase(req: Request): string {
  const configured = process.env.PUBLIC_URL || process.env.FRONTEND_URL;
  if (configured) return configured.replace(/\/+$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

// POST /api/auth/device { clientName? }
export function startDevice(req: Request, res: Response): void {
  try {
    const clientName = typeof req.body?.clientName === "string" ? req.body.clientName : "";
    const p = startDeviceLogin(clientName);
    const verificationUri = `${websiteBase(req)}/connect`;
    res.status(200).json({
      deviceCode: p.deviceCode,
      userCode: p.userCode,
      verificationUri,
      verificationUriComplete: `${verificationUri}?code=${encodeURIComponent(p.userCode)}`,
      interval: p.intervalS,
      expiresIn: DEVICE_CODE_TTL_MS / 1000,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "TOO_MANY_PENDING_LOGINS") {
      res.status(503).json({ message: "Too many sign-ins in progress, try again in a few minutes" });
      return;
    }
    throw err;
  }
}

// POST /api/auth/device/token { deviceCode }, polled by the app
export async function pollDevice(req: Request, res: Response): Promise<void> {
  const deviceCode = req.body?.deviceCode;
  if (typeof deviceCode !== "string" || !deviceCode) {
    res.status(400).json({ error: "invalid_request", message: "deviceCode is required" });
    return;
  }
  const result = await pollDeviceLogin(deviceCode);
  switch (result.status) {
    case "approved":
      res.status(200).json({ token: result.token, user: result.user });
      return;
    case "pending":
      res.status(400).json({ error: "authorization_pending", message: "Waiting for approval in the browser" });
      return;
    case "slow_down":
      res.status(400).json({ error: "slow_down", message: "Polling too fast" });
      return;
    case "denied":
      res.status(400).json({ error: "access_denied", message: "The sign-in was declined" });
      return;
    default:
      res.status(400).json({ error: "expired_token", message: "The sign-in code expired. Start again." });
  }
}

function withUserCode(req: Request, res: Response, action: (code: string) => void): void {
  const code = (req.params.userCode ?? req.body?.userCode) as unknown;
  if (typeof code !== "string" || !code.trim()) {
    res.status(400).json({ message: "userCode is required" });
    return;
  }
  try {
    action(code);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_USER_CODE") {
      res.status(404).json({ message: "That code is invalid or has expired. Start signing in again from the app." });
      return;
    }
    throw err;
  }
}

// GET /api/auth/device/:userCode: what the approval page shows
export function describeDevice(req: Request, res: Response): void {
  withUserCode(req, res, (code) => res.status(200).json(describeUserCode(code)));
}

// POST /api/auth/device/approve { userCode }
export function approveDevice(req: Request, res: Response): void {
  withUserCode(req, res, (code) => {
    approveUserCode(code, req.user!.id);
    res.status(200).json({ message: "Approved. You can return to the app." });
  });
}

// POST /api/auth/device/deny { userCode }
export function denyDevice(req: Request, res: Response): void {
  withUserCode(req, res, (code) => {
    denyUserCode(code);
    res.status(200).json({ message: "Declined" });
  });
}

// GET /api/auth/tokens: the apps signed in to my account
export async function listTokens(req: Request, res: Response): Promise<void> {
  res.status(200).json({ tokens: await listClientTokens(req.user!.id) });
}

// DELETE /api/auth/tokens/:tokenId
export async function revokeToken(req: Request, res: Response): Promise<void> {
  const ok = await revokeClientToken(req.user!.id, String(req.params.tokenId));
  if (!ok) {
    res.status(404).json({ message: "Token not found" });
    return;
  }
  res.status(204).send();
}

// DELETE /api/auth/tokens/current: an app signing itself out
export async function revokeCurrentToken(req: Request, res: Response): Promise<void> {
  if (req.authKind !== "client-token" || !req.clientTokenId) {
    res.status(400).json({ message: "Only an app signed in with a token can sign itself out this way" });
    return;
  }
  await revokeClientToken(req.user!.id, req.clientTokenId);
  res.status(204).send();
}
