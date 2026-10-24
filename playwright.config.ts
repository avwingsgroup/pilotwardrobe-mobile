import { defineConfig, devices } from '@playwright/test'

/**
 * Browser E2E against the app served by `npm run dev` (which proxies /api to the
 * Laravel host in .env.development). Uses the installed Chrome, mobile viewport.
 * Native behaviour (camera, push, secure storage, back button) is covered by the
 * device checklist in docs/mobile-testing.md, not here.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    ...devices['Pixel 7'],
    channel: 'chrome',
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8100',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
