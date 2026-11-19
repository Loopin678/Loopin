import { Request, Response } from "express";
import {createProjectService,getProjectByIdService,getProjectsByUserIdService,updateProjectService,
  deleteProjectService} from "../services/project.service";
import { closeProjectRoom } from "../library/socket";

export async function createProject(req: Request,res: Response): Promise<void> {
try {
    const { name, stack } = req.body;
    const userId = req.user?.id; // never trust a userId from the body

    if (!name || typeof name !== "string") {
      res.status(400).json({
        message: "Project name is required",
      });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }


     const project = await createProjectService({name, userId, stack});

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

export async function getMyProjects(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        message: "Authentication required",
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

export async function getProjectById(req: Request,res: Response): Promise<void> {
try{
    const { projectId } = req.params;

    if (typeof projectId !== "string") {
      res.status(400).json({
        message: "Invalid projectId",
      });
      return;
    }

    const requesterId = req.user?.id;
    if (!requesterId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const project = await getProjectByIdService(projectId, requesterId);

    res.status(200).json({
      project,
    });
} 
catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_NOT_PROJECT_MEMBER") {
      res.status(403).json({ message: "You are not a member of this project" });
      return;
    }
    if (error instanceof Error && error.message === "Project not found"){
      res.status(404).json({
        message: error.message,
      });
      return;
    }
if (error instanceof Error && error.message === "User ID is Required"){
      res.status(400).json({
        message: error.message,
      });
      return;
    }

    if (error instanceof Error && error.message === "Stack is Required"){
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

    const requesterId = req.user?.id;
    if (!requesterId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    if (userId !== requesterId) {
      res.status(403).json({ message: "You can only view your own projects" });
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

// A project cover is null (default), one of the stock images, a #rrggbb colour,
// or a small image the browser already resized (kept inline, so it is size-capped)
const STOCK_COVER_IDS = ["hills", "aurora", "contours", "horizon", "dunes", "loops", "mesh", "peaks"];
const MAX_COVER_IMAGE_CHARS = 90_000;

function isValidCover(cover: unknown): cover is string | null {
  if (cover === null) return true;
  if (typeof cover !== "string") return false;
  if (cover.startsWith("stock:")) return STOCK_COVER_IDS.includes(cover.slice(6));
  if (cover.startsWith("color:")) return /^color:#[0-9a-fA-F]{6}$/.test(cover);
  return (
    cover.length <= MAX_COVER_IMAGE_CHARS &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(cover)
  );
}

export async function updateProject(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { projectId } = req.params;
    const { name, cover } = req.body;

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

    if (cover !== undefined && !isValidCover(cover)) {
      res.status(400).json({
        message: "Invalid cover. Use a stock image, a colour, or an image under 90 KB",
      });
      return;
    }

    const requesterId = req.user?.id;
    if (!requesterId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const project = await updateProjectService(projectId, requesterId, {
      name,
      cover,
    });

    res.status(200).json({
      project,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "FORBIDDEN_NOT_PROJECT_MEMBER" || error.message === "FORBIDDEN_NOT_PROJECT_OWNER")) {
      res.status(403).json({ message: "Only the project owner can change this project" });
      return;
    }
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

    const requesterId = req.user?.id;
    if (!requesterId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const deleted = await deleteProjectService(projectId, requesterId);

    closeProjectRoom(deleted.id, deleted.memberIds);


    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && (error.message === "FORBIDDEN_NOT_PROJECT_MEMBER" || error.message === "FORBIDDEN_NOT_PROJECT_OWNER")) {
      res.status(403).json({ message: "Only the project owner can delete this project" });
      return;
    }
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