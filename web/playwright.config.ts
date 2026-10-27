import { defineConfig, devices } from "@playwright/test";
import { MOCK_API_BASE_URL } from "./src/mocks/mock-api.ts";

export default defineConfig({
  testDir: "./tests/integration",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
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
    env: { API_BASE_URL: MOCK_API_BASE_URL },
  },
});
