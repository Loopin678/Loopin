import { Router } from "express";

import {register, login, logout, me, googleCallback, googleLogin,
     githubLogin, githubCallback
} from "../controllers/auth.controller"
import { requireAuth, requireSession } from "../middleware/auth.middleware";
import {
  approveDevice, denyDevice, describeDevice, listTokens, pollDevice, revokeCurrentToken, revokeToken, startDevice,
} from "../controllers/device-auth.controller";
import { authLimiter } from "../library/rateLimit";

const router = Router();

router.post("/register", authLimiter, register);

router.post("/login", authLimiter, login);

router.post("/logout", logout);

router.get("/me", requireAuth, me);

router.get("/google", googleLogin);

router.get("/github", githubLogin);

router.get("/google/callback",googleCallback);

router.get("/github/callback",githubCallback);

// "Sign in with Loopin" for the desktop app / CLI (see device-auth.service.ts)
router.post("/device", authLimiter, startDevice);
router.post("/device/token", pollDevice);
router.get("/device/:userCode", requireSession, describeDevice);
router.post("/device/approve", requireSession, approveDevice);
router.post("/device/deny", requireSession, denyDevice);

// Apps signed in to my account
router.get("/tokens", requireSession, listTokens);
router.delete("/tokens/current", requireAuth, revokeCurrentToken);
router.delete("/tokens/:tokenId", requireSession, revokeToken);

export default router;