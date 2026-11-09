// Runs the real web app and API against the Firebase emulators.
// Start everything with `pnpm test:e2e` at the repo root, which wraps this in `emulators:exec`.
import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  // Demo sign-in seeds a profile, a skill and a plan; on busy CI machines that can take seconds.
  expect: { timeout: 10_000 },
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      // FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST come from `emulators:exec`.
      command: 'uv run --directory ../api uvicorn darb_api.main:create_app --factory --port 8000',
      url: 'http://127.0.0.1:8000/api/health',
      env: {
        ...process.env,
        FIREBASE_PROJECT_ID: 'demo-darb',
        ENVIRONMENT: 'local',
        AI_PROVIDERS: 'fake',
      },
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      // web/.env.development points the app at the emulators.
      command: 'pnpm --filter @darb/web exec vite --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
});
