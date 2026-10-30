import { Router } from "express";

import {register, login, logout, me, googleCallback, googleLogin} from "../controllers/auth.controller"
import { requireAuth } from "../middleware/auth.middleware";
import { authLimiter } from "../library/rateLimit";

const router = Router();

router.post("/register", authLimiter, register);

router.post("/login", authLimiter, login);

router.post("/logout", logout);

router.get("/me", requireAuth, me);

router.get("/google", googleLogin);

router.get("/google/callback",googleCallback);

export default router;