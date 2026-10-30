import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { getMyProfile, updateMyProfile, getUserProfile } from "../controllers/profile.controller";

const profileRoutes = Router();

profileRoutes.use(requireAuth);

// "/me" must come BEFORE "/:userId", or Express would read "me" as a user id
profileRoutes.get("/me", getMyProfile);
profileRoutes.patch("/me", updateMyProfile);
profileRoutes.get("/:userId", getUserProfile);

export { profileRoutes };