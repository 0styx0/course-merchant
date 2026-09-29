import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config({
  path: ".env.test",
  override: true,
});

export default defineConfig({
  test: {
    include: ["src/**/*.integration.spec.ts"],
    fileParallelism: false,
  },
});