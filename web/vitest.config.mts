import { defineConfig } from "vitest/config";
import { MOCK_API_BASE_URL, MOCK_CONTACT_EMAIL } from "./src/mocks/mock-api.ts";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts", "./src/test/temporal-equality.ts"],
    // API_BASE_URL is the address the MSW handlers listen on.
    // CONTACT_EMAIL is the address the footer's Contact link opens.
    // TZ defaults to a zone with a +12:45/+13:45 offset, so a test that assumes UTC fails.
    env: {
      API_BASE_URL: MOCK_API_BASE_URL,
      CONTACT_EMAIL: MOCK_CONTACT_EMAIL,
      TZ: process.env.TZ ?? "Pacific/Chatham",
    },
    exclude: [
      "node_modules",
      ".next",
      "tests/browser/**",
      "playwright.config.*",
    ],
  },
});
