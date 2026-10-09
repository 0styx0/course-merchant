import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
import tsconfigPaths from "vite-tsconfig-paths";

dotenv.config({
  path: ".env.test",
  override: true,
});

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["src/**/*.integration.spec.ts"],
    fileParallelism: false,
    setupFiles: ["./src/test/integration.setup.ts"]
  },
});