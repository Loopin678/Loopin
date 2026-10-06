import { Request, Response } from "express";
import { commitService } from "../services/commit.service";

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

    const commit = await commitService.reportCommit({
      sha,
      message,
      projectId,
      authorId,
      taskIds,
    });

    res.status(201).json(commit);
  } catch (error) {
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
