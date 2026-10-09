import { defineConfig, devices } from "@playwright/test";

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
  } ,
});