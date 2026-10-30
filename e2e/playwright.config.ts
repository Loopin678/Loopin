import { defineConfig, devices } from '@playwright/test';

// Same throwaway database as the backend tests (never the shared one: see guard below)
const databaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:55433/loopin_test';
const host = new URL(databaseUrl).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
  throw new Error(`Refusing to run end-to-end tests against ${host}; use a local throwaway database`);
}

const API_PORT = 3100;
const WEB_PORT = 5174;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Backend on its own port, schema pushed to the test database first
      command: `npx prisma db push --skip-generate --accept-data-loss && npx tsx src/index.ts`,
      cwd: '../backend',
      url: `http://localhost:${API_PORT}/api/auth/me`,
      // /api/auth/me answers 401 when signed out, which still means "up"
      ignoreHTTPSErrors: true,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: databaseUrl,
        PORT: String(API_PORT),
        NODE_ENV: 'test',
        JWT_SECRET: 'e2e-secret',
        FRONTEND_URL: `http://localhost:${WEB_PORT}`,
      },
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      cwd: '../frontend',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { LOOPIN_API_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});
