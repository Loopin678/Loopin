import { normalizeUsername, validateUsername } from "../library/username";
import * as profileRepo from "../repositories/profile.repository";
import { findProjectMembershipsByUserId } from "../repositories/project-member.repository";

const NAME_MAX = 50;
const BIO_MAX = 160;
const SKILLS_MAX = 10;
const SKILL_MAX_LENGTH = 24;

// Thrown for input the user can fix. The message is written for them, so the
// controller passes it straight through (unlike the fixed error codes elsewhere).
export class ProfileValidationError extends Error {}

export async function getMyProfile(userId: string) {
  const profile = await profileRepo.findOwnProfile(userId);
  if (!profile) throw new Error("User not found");
  return profile;
}

export async function getUserProfile(viewerId: string, targetId: string) {
  const profile = await profileRepo.findPublicProfile(viewerId, targetId);
  if (!profile) throw new Error("User not found");
  return profile;
}

export async function updateMyProfile(
  userId: string,
  input: { name?: string; username?: string; bio?: string | null; skills?: string[] }
) {
  // Only fields that were actually sent end up here, so nothing else is overwritten
  const data: { name?: string; username?: string; bio?: string | null; skills?: string[] } = {};

  if (input.name !== undefined) {
    const name = input.name.trim().replace(/\s+/g, " ");
    if (name.length < 1 || name.length > NAME_MAX) {
      throw new ProfileValidationError(`Name must be 1-${NAME_MAX} characters`);
    }
    data.name = name;
  }

  if (input.username !== undefined) {
    const username = normalizeUsername(input.username);
    const problem = validateUsername(username);
    if (problem) throw new ProfileValidationError(problem);
    data.username = username;
  }

  if (input.bio !== undefined) {
    const bio = (input.bio ?? "").trim();
    if (bio.length > BIO_MAX) {
      throw new ProfileValidationError(`Bio can be at most ${BIO_MAX} characters`);
    }
    data.bio = bio === "" ? null : bio;
  }

  if (input.skills !== undefined) {
    const seen = new Set<string>();
    const skills: string[] = [];

    for (const raw of input.skills) {
      const skill = raw.trim().replace(/\s+/g, " ");
      if (!skill) continue;
      if (skill.length > SKILL_MAX_LENGTH) {
        throw new ProfileValidationError(`Each skill can be at most ${SKILL_MAX_LENGTH} characters`);
      }
      const key = skill.toLowerCase();
      if (seen.has(key)) continue; // "React" and "react" count once
      seen.add(key);
      skills.push(skill);
    }

    if (skills.length > SKILLS_MAX) {
      throw new ProfileValidationError(`You can list at most ${SKILLS_MAX} skills`);
    }
    data.skills = skills;
  }

  if (Object.keys(data).length === 0) {
    throw new ProfileValidationError("Nothing to update");
  }

  const profile = await profileRepo.updateProfile(userId, data);

  // The projects whose members should hear about this (ACTIVE memberships only)
  const memberships = await findProjectMembershipsByUserId(userId);

  return { profile, projectIds: memberships.map((m) => m.projectId) };
}