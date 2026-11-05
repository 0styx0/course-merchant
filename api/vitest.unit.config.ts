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
    setupFiles: ["./src/test/temporal-equality.ts"],
    include: ["src/**/*.spec.ts"],
    exclude: ["src/**/*.integration.spec.ts", "src/test/e2e/"],
  },
});
