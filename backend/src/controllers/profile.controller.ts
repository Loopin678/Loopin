import { Request, Response } from "express";
import * as profileService from "../services/profile.service";
import { notifyProfileUpdated } from "../library/socket";

export async function getMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const profile = await profileService.getMyProfile(userId);

    res.status(200).json({ profile });
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      res.status(404).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Only these four keys are ever read from the body. Anything else the client
    // sends (email, password, googleId, id, ...) is ignored.
    const { name, username, bio, skills } = req.body ?? {};

    if (name !== undefined && typeof name !== "string") {
      res.status(400).json({ message: "Invalid name" });
      return;
    }
    if (username !== undefined && typeof username !== "string") {
      res.status(400).json({ message: "Invalid username" });
      return;
    }
    if (bio !== undefined && bio !== null && typeof bio !== "string") {
      res.status(400).json({ message: "Invalid bio" });
      return;
    }
    if (skills !== undefined && (!Array.isArray(skills) || !skills.every((s) => typeof s === "string"))) {
      res.status(400).json({ message: "Invalid skills" });
      return;
    }

    const { profile, projectIds } = await profileService.updateMyProfile(userId, { name, username, bio, skills });

    // Teammates' screens and our own other tabs update live
    notifyProfileUpdated(profile, projectIds);

    res.status(200).json({ profile });
  } catch (error) {
    if (error instanceof profileService.ProfileValidationError) {
      res.status(400).json({ message: error.message });
      return;
    }
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      res.status(409).json({ message: "That username is already taken" });
      return;
    }
    if (error instanceof Error && error.message === "User not found") {
      res.status(404).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getUserProfile(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      res.status(400).json({ message: "Invalid userId" });
      return;
    }

    const viewerId = req.user?.id;
    if (!viewerId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const profile = await profileService.getUserProfile(viewerId, userId);

    res.status(200).json({ profile });
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      res.status(404).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}