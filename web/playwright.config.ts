import { defineConfig, devices } from "@playwright/test";
import { MOCK_API_BASE_URL, MOCK_CONTACT_EMAIL } from "./src/mocks/mock-api.ts";

export default defineConfig({
  testDir: "./tests/browser",
  // CI starts a fresh `next dev`, which compiles each route on its first visit
  // (the edit page took about 7 s), so its tests and assertions wait longer
  // than a warm local server needs.
  timeout: process.env.CI ? 60_000 : 30_000,
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  use: {
    baseURL: "http://localhost:3000",
    // CI never retries, so "on-first-retry" would record nothing there; the
    // CI workflow uploads these traces when a test fails.
    trace: process.env.CI ? "retain-on-failure" : "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "PLAYWRIGHT=1 yarn dev",
    url: "http://localhost:3000/health",
    reuseExistingServer: !process.env.CI,
    // The same URL the MSW handlers intercept, so the tests don't depend on a
    // local .env.local
    env: { API_BASE_URL: MOCK_API_BASE_URL, CONTACT_EMAIL: MOCK_CONTACT_EMAIL },
  },
});
