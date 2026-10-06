import { commitRepository } from "../repositories/commit.repository";
import { CommitInput } from "../types/commit";

async function getCommitsByProject(projectId: string) {
  return commitRepository.getCommitsByProjectId(projectId);
}

async function reportCommit(data: CommitInput) {
  return commitRepository.upsertCommit(data);
}

export const commitService = { getCommitsByProject, reportCommit };
