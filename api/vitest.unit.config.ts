import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  test: {
    include: ["src/**/*.spec.ts"],
    exclude: ["src/**/*.integration.spec.ts", "src/test/e2e/"],
  },
});