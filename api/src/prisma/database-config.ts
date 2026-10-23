import "dotenv/config.js";
import { z } from "zod";

const databaseEnvSchema = z.object({
  // e.g. postgres://user:pass@localhost:5432/merchant
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "must be a postgres:// or postgresql:// URL"),
});

/**
 * Reads the database URL from the environment. Throws on startup when it is
 * missing or malformed, naming the variable but never echoing its value (the
 * URL holds a password).
 */
export function loadDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const result = databaseEnvSchema.safeParse(env);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")} ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid database configuration: ${problems}.`);
  }

  return result.data.DATABASE_URL;
}
