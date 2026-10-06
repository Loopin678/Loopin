import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding initial data for Loopin...");

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@loopin.dev" },
    update: {},
    create: {
      name: "Demo Developer",
      email: "demo@loopin.dev",
      password: "password123",
    },
  });

  console.log(`User created: ${user.id} (${user.email})`);

  // Create demo project
  let project = await prisma.project.findFirst({
    where: { name: "Loopin Desktop Demo" },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: "Loopin Desktop Demo",
        members: {
          create: {
            userId: user.id,
            stack: "Fullstack",
          },
        },
      },
    });
  }

  console.log(`Project created: ${project.id} (${project.name})`);

  // Create demo lists
  let todoList = await prisma.list.findFirst({
    where: { projectId: project.id, name: "To Do" },
  });

  if (!todoList) {
    todoList = await prisma.list.create({
      data: {
        name: "To Do",
        position: 0,
        projectId: project.id,
      },
    });
  }

  let inProgressList = await prisma.list.findFirst({
    where: { projectId: project.id, name: "In Progress" },
  });

  if (!inProgressList) {
    inProgressList = await prisma.list.create({
      data: {
        name: "In Progress",
        position: 1,
        projectId: project.id,
      },
    });
  }

  // Create sample tasks
  const taskCount = await prisma.task.count({
    where: { projectId: project.id },
  });

  if (taskCount === 0) {
    await prisma.task.createMany({
      data: [
        {
          title: "Implement AI commit grouping UI",
          description: "Connect QML inbox view with backend AI grouping",
          position: 0,
          stack: "Desktop",
          listId: inProgressList.id,
          projectId: project.id,
          assigneeId: user.id,
        },
        {
          title: "Setup libgit2 merge conflict detection",
          description: "Detect merge conflicts and notify via QML signal",
          position: 1,
          stack: "Desktop",
          listId: inProgressList.id,
          projectId: project.id,
          assigneeId: user.id,
        },
        {
          title: "Sync desktop commit reports with PostgreSQL",
          description: "Store SHA and link task IDs upon commit",
          position: 0,
          stack: "Backend",
          listId: todoList.id,
          projectId: project.id,
          assigneeId: user.id,
        },
      ],
    });
    console.log("Sample tasks created.");
  }

  console.log("\n--- Setup Instructions for Desktop Client ---");
  console.log(`Backend URL: http://localhost:3000`);
  console.log(`Project ID:  ${project.id}`);
  console.log(`User ID:     ${user.id}`);
  console.log("---------------------------------------------\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
