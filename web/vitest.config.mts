import { defineConfig } from "vitest/config";
import { MOCK_API_BASE_URL } from "./src/mocks/mock-api.ts";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // The address the MSW handlers listen on
    env: { API_BASE_URL: MOCK_API_BASE_URL },
    exclude: [
      "node_modules",
      ".next",
      "tests/integration/**",
      "playwright.config.*",
    ],
  },
});
