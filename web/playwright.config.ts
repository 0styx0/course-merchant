import { defineConfig, devices } from "@playwright/test";
import { apiBaseUrl } from "./src/mocks/handlers/handler-utils";

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
    env: { API_BASE_URL: apiBaseUrl },
  },
});
