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
    include: ["src/**/*.integration.spec.ts"],
    fileParallelism: false,
    setupFiles: [
      "./src/test/temporal-equality.ts",
      "./src/test/integration.setup.ts",
    ],
  },
});
