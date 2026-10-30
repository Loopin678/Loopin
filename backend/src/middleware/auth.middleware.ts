import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../library/auth.js";
import { CLIENT_TOKEN_PREFIX, verifyClientToken } from "../services/client-token.service";
// Auth payload is data sent during login or signup request
type AuthPayload = {
  userId: string;
};

function isAuthPayload(
  payload: string | jwt.JwtPayload
): payload is AuthPayload {
  return (
    typeof payload !== "string" &&
    typeof payload.userId === "string" &&
    payload.userId.length > 0
  );
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : undefined;

  // Desktop app / CLI: an opaque token from "Sign in with Loopin"
  if (bearer?.startsWith(CLIENT_TOKEN_PREFIX)) {
    verifyClientToken(bearer)
      .then((verified) => {
        if (!verified) {
          res.status(401).json({ message: "This sign-in was revoked or is invalid. Sign in again." });
          return;
        }
        req.user = { id: verified.userId };
        req.authKind = "client-token";
        req.clientTokenId = verified.tokenId;
        next();
      })
      .catch(next);
    return;
  }

  // Website: the session JWT, as a cookie or Bearer header
  const token = req.cookies?.auth_token || bearer;

  if (!token) {
    res.status(401).json({
      message: "Authentication required",
    });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (!isAuthPayload(payload)) {
      res.status(401).json({
        message: "Invalid authentication token",
      });
      return;
    }

    req.user = {
      id: payload.userId,
    };
    req.authKind = "session";

    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid or expired authentication token",
    });
  }
}

// Only a signed-in website session, not a desktop/CLI token: for approving new
// sign-ins and managing them, so a leaked app token can't mint more tokens
export function requireSession(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.authKind !== "session") {
      res.status(403).json({ message: "Do this from the Loopin website while signed in" });
      return;
    }
    next();
  });
}
