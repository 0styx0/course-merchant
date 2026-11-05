import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config({
  path: ".env.test",
  override: true,
});

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    env: { TZ: process.env.TZ ?? "Pacific/Chatham" },
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    include: ["src/test/e2e/**/*.spec.ts"],
    fileParallelism: false,
    setupFiles: [
      "./src/test/temporal-equality.ts",
      "./src/test/integration.setup.ts",
    ],
  },
});
