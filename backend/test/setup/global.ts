import { execSync } from "node:child_process";
import { assertLocalTestDatabase } from "./guard";

// Runs once before all test files: bring the throwaway database to the current schema
export default function setup(): void {
  const url = process.env.DATABASE_URL;
  assertLocalTestDatabase(url);
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url },
  });
}
