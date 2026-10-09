import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config({
  path: ".env.test",
  override: true,
});

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  test: {
    include: ["src/test/e2e/**/*.spec.ts"],
    fileParallelism: false,
    setupFiles: ["./src/test/integration.setup.ts"]
  },
});