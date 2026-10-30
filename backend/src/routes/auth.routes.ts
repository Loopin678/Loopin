import { Router } from "express";

import {register, login, logout, me, googleCallback, googleLogin,
     githubLogin, githubCallback
} from "../controllers/auth.controller"
import { requireAuth } from "../middleware/auth.middleware";
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

export default router;