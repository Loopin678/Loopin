import { afterAll, beforeEach } from "vitest";
import { prisma } from "../../src/library/prisma";
import { assertLocalTestDatabase } from "./guard";

assertLocalTestDatabase(process.env.DATABASE_URL);

// Every test starts from empty tables
beforeEach(async () => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length > 0) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`
    );
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
