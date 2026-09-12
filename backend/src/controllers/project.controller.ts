import { Request, Response } from "express";
import {createProjectService,getProjectByIdService,getProjectsByUserIdService,updateProjectService,
  deleteProjectService} from "../services/project.service";

export async function createProject(req: Request,res: Response): Promise<void> {
try {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      res.status(400).json({
        message: "Project name is required",
      });
      return;
    }

     const project = await createProjectService({name});

    res.status(201).json({project,});
} 
catch(err){
     console.error(err);

     if (err instanceof Error && err.message === "Project name is Required"){
          res.status(400).json({
          message: err.message,
     });
          return;
    }

     res.status(500).json({
          message: "Internal Server Error",
     });
}
}

export async function getProjectById(req: Request,res: Response): Promise<void> {
try{
    const { projectId } = req.params;

    if (typeof projectId !== "string") {
      res.status(400).json({
        message: "Invalid projectId",
      });
      return;
    }

    const project = await getProjectByIdService(projectId);

    res.status(200).json({
      project,
    });
} 
catch (error) {
    if (error instanceof Error && error.message === "Project not found"){
      res.status(404).json({
        message: error.message,
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export async function getProjectsByUserId(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId } = req.params;

     if (typeof userId !== "string"){
          res.status(400).json({
          message: "Invalid userId",
          });
          return;
     }

    const projects = await getProjectsByUserIdService(userId);

    res.status(200).json({
      projects,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export async function updateProject(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { projectId } = req.params;
    const { name } = req.body;

    if (typeof projectId !== "string") {
      res.status(400).json({
        message: "Invalid projectId",
      });
      return;
    }

    if (name !== undefined && typeof name !== "string") {
      res.status(400).json({
        message: "Invalid project name",
      });
      return;
    }

    const project = await updateProjectService(projectId, {
      name,
    });

    res.status(200).json({
      project,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Project not found"
    ) {
      res.status(404).json({
        message: error.message,
      });
      return;
    }

    if (error instanceof Error && error.message === "Project name can't be empty"){
          res.status(400).json({
          message: error.message,
          });
          return;
    }

    console.error(error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export async function deleteProject(req: Request,res: Response): Promise<void> {
try{
     const { projectId } = req.params;

     if (typeof projectId !== "string") {
          res.status(400).json({
          message: "Invalid projectId",
          });
      return;
     }

    await deleteProjectService(projectId);

    res.status(204).send();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Project not found or Doesnt exist"
    ) {
      res.status(404).json({
        message: error.message,
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}