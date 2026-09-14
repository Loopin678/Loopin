export type ProjectRole = "OWNER" | "ADMIN" | "MEMBER";

export type ProjectMember = {
     id: string;
     projectId: string;
     userId: string;
     role: ProjectRole;
     createdAt: Date;
}