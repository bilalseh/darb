// Captures the README screenshots and demo GIF frames: `pnpm screenshots` at the repo root.
// Same servers as the E2E tests (fake AI, emulators); output goes to docs/media.
import { defineConfig, devices } from '@playwright/test';

import base from './playwright.config';

export default defineConfig({
  ...base,
  testDir: './capture',
  retries: 0,
  reporter: 'list',
  projects: [
    {
      name: 'desktop',
      grep: /desktop screenshots/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    { name: 'phone', grep: /phone screenshots/, use: { ...devices['Pixel 7'] } },
    {
      name: 'gif',
      grep: /onboarding, placement/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1000, height: 680 },
        video: { mode: 'on', size: { width: 1000, height: 680 } },
      },
    },
  ],
});
