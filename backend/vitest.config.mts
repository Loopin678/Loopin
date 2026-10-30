import { defineConfig } from "vitest/config";

// Must be set before anything imports dotenv: dotenv never overrides an existing
// variable, so the shared database URL in .env can't leak into the tests.
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55433/loopin_test";
process.env.DATABASE_URL = testDatabaseUrl;

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      FRONTEND_URL: "",
    },
    globalSetup: ["test/setup/global.ts"],
    setupFiles: ["test/setup/each-file.ts"],
    // One database, so test files run one after another
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/types/**"],
      reporter: ["text-summary", "html", "lcov"],
    },
  },
});
