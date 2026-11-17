import { Request, Response } from "express";
import { commitService } from "../services/commit.service";
import { taskSuggestionService } from "../services/taskSuggestion.service";
import { getIO, notifyMyTasksChanged } from "../library/socket";

export async function getProjectCommits(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    if (!projectId || typeof projectId !== "string") {
      res.status(400).json({ message: "Invalid projectId" });
      return;
    }

    const commits = await commitService.getCommitsByProject(projectId);
    res.status(200).json(commits);
  } catch (error) {
    console.error("Error fetching project commits:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function reportCommit(req: Request, res: Response): Promise<void> {
  try {
    const { sha, message, projectId, authorId, taskIds } = req.body;

    if (!sha || !message || !projectId || !authorId) {
      res.status(400).json({ message: "Missing required fields: sha, message, projectId, authorId" });
      return;
    }
    if (typeof sha !== "string" || !/^[0-9a-f]{7,64}$/i.test(sha)) {
      res.status(400).json({ message: "sha must be a git commit hash" });
      return;
    }
    if (taskIds !== undefined && (!Array.isArray(taskIds) || !taskIds.every((t: unknown) => typeof t === "string"))) {
      res.status(400).json({ message: "taskIds must be an array of task ids" });
      return;
    }

    const commit = await commitService.reportCommit({
      sha,
      message,
      projectId,
      authorId,
      taskIds,
    });

    res.status(201).json(commit);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTHOR_NOT_PROJECT_MEMBER") {
      res.status(403).json({ message: "User ID is not an active member of this project. Check Project ID and User ID in Settings." });
      return;
    }
    if (error instanceof Error && error.message === "COMMIT_IN_OTHER_PROJECT") {
      res.status(409).json({ message: "This commit is already recorded under a different project" });
      return;
    }
    console.error("Error reporting commit:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function groupCommits(req: Request, res: Response): Promise<void> {
  try {
    const { changes, task_id } = req.body;
    if (!Array.isArray(changes) || changes.length === 0) {
      res.status(200).json([]);
      return;
    }

    // Default grouping by top-level folder
    const groupsMap = new Map<string, string[]>();
    for (const change of changes) {
      const filePath = change.filePath || "";
      const prefix = filePath.includes("/") ? filePath.split("/")[0] : "root";
      if (!groupsMap.has(prefix)) {
        groupsMap.set(prefix, []);
      }
      groupsMap.get(prefix)!.push(filePath);
    }

    const groups: { message: string; files: string[] }[] = [];
    for (const [prefix, files] of groupsMap.entries()) {
      groups.push({
        message: `feat(${prefix}): update ${files.length} file(s)`,
        files,
      });
    }

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error grouping commits:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

const SHA_RE = /^[0-9a-f]{7,64}$/i;

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

// POST /api/commits/suggest-tasks
// Body: { sha, message, projectId, authorId, files: string[], diff: string }
// Returns which open tasks the commit most likely completes. Read-only: moves nothing.
export async function suggestTasksForCommit(req: Request, res: Response): Promise<void> {
  try {
    const { sha, message, projectId, authorId, files, diff } = req.body ?? {};
    if (typeof sha !== "string" || !SHA_RE.test(sha)) {
      res.status(400).json({ message: "sha must be a git commit hash" });
      return;
    }
    if (typeof message !== "string" || typeof projectId !== "string" || !projectId || typeof authorId !== "string" || !authorId) {
      res.status(400).json({ message: "Missing required fields: sha, message, projectId, authorId" });
      return;
    }
    if (files !== undefined && !isStringArray(files)) {
      res.status(400).json({ message: "files must be an array of paths" });
      return;
    }
    if (diff !== undefined && typeof diff !== "string") {
      res.status(400).json({ message: "diff must be a string" });
      return;
    }

    const result = await taskSuggestionService.suggestTasksForCommit({
      sha, message, projectId, authorId, files: files ?? [], diff: diff ?? "",
    });
    res.status(200).json({ sha, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_NOT_PROJECT_MEMBER") {
      res.status(403).json({ message: "User ID is not an active member of this project. Check Project ID and User ID in Settings." });
      return;
    }
    console.error("Error suggesting tasks for commit:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// POST /api/commits/:sha/complete-tasks
// Body: { message, projectId, authorId, taskIds: string[] }
// Called only after the user approved the suggestion. Moves the tasks to the
// project's DONE list, links them to the commit, and tells every open board.
export async function completeTasksFromCommit(req: Request, res: Response): Promise<void> {
  try {
    const { sha } = req.params;
    const { message, projectId, authorId, taskIds } = req.body ?? {};
    if (typeof sha !== "string" || !SHA_RE.test(sha)) {
      res.status(400).json({ message: "sha must be a git commit hash" });
      return;
    }
    if (typeof message !== "string" || !message || typeof projectId !== "string" || !projectId || typeof authorId !== "string" || !authorId) {
      res.status(400).json({ message: "Missing required fields: message, projectId, authorId" });
      return;
    }
    if (!isStringArray(taskIds) || taskIds.length === 0 || taskIds.length > 20) {
      res.status(400).json({ message: "taskIds must be a non-empty array of task ids" });
      return;
    }

    const { doneList, moved } = await taskSuggestionService.completeTasksFromCommit({
      sha, message, projectId, authorId, taskIds,
    });

    // Same events the web board sends when someone drags a card, so open boards update live
    const io = getIO();
    for (const task of moved) {
      io.to(`project:${task.projectId}`).emit("task:moved", task);
      notifyMyTasksChanged([task.assigneeId], task.projectId, task.id);
    }

    res.status(200).json({ doneList, moved });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FORBIDDEN_NOT_PROJECT_MEMBER" || error.message === "AUTHOR_NOT_PROJECT_MEMBER") {
        res.status(403).json({ message: "User ID is not an active member of this project. Check Project ID and User ID in Settings." });
        return;
      }
      if (error.message === "NO_DONE_LIST") {
        res.status(409).json({ message: "This project has no Done list to move tasks into" });
        return;
      }
      if (error.message === "TASK_NOT_IN_PROJECT") {
        res.status(404).json({ message: "One or more tasks are not in this project" });
        return;
      }
      if (error.message === "COMMIT_IN_OTHER_PROJECT") {
        res.status(409).json({ message: "This commit is already recorded under a different project" });
        return;
      }
    }
    console.error("Error completing tasks from commit:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
