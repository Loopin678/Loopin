require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAiUser() {
  const existing = await prisma.user.findUnique({ where: { email: 'ai@loopin.system' } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: 'AI Assistant',
        email: 'ai@loopin.system',
        password: 'unused',
      },
    });
    console.log('AI user created.');
  } else {
    console.log('AI user already exists.');
  }
}

seedAiUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());