const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with test values...');

  // 1. Create a Test User
  const testUser = await prisma.user.create({
    data: {
      name: 'Test User',
      email: `testuser_${Date.now()}@example.com`,
      password: 'password123',
    },
  });
  console.log(`Created User: ${testUser.id}`);

  // 2. Create a Test Project
  const testProject = await prisma.project.create({
    data: {
      name: 'Loopin Test Project',
    },
  });
  console.log(`Created Project: ${testProject.id}`);

  // 3. Add User to Project
  await prisma.projectMember.create({
    data: {
      userId: testUser.id,
      projectId: testProject.id,
      stack: 'fullstack',
    },
  });

  // 4. Create a Kanban List for the Project
  const testList = await prisma.list.create({
    data: {
      name: 'In Progress',
      position: 1,
      projectId: testProject.id,
    },
  });

  // 5. Create some Tasks
  const tasksToCreate = [
    { title: 'Design the new landing page UI', position: 1 },
    { title: 'Fix the authentication bug on mobile', position: 2 },
    { title: 'Write tests for the API endpoints', position: 3 },
  ];

  for (const taskData of tasksToCreate) {
    const task = await prisma.task.create({
      data: {
        title: taskData.title,
        position: taskData.position,
        listId: testList.id,
        projectId: testProject.id,
        assigneeId: testUser.id,
      },
    });
    console.log(`Created Task: [${task.id}] ${task.title}`);
  }

  console.log('\n--- Test IDs ---');
  console.log(`Project ID: ${testProject.id}`);
  console.log(`User ID: ${testUser.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
