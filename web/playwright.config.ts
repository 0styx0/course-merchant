import { defineConfig, devices } from "@playwright/test";
import { MOCK_API_BASE_URL, MOCK_CONTACT_EMAIL } from "./src/mocks/mock-api.ts";

export default defineConfig({
  testDir: "./tests/browser",
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
