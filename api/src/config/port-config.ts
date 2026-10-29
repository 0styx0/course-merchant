import "dotenv/config.js";
import { z } from "zod";

const DEFAULT_PORT = 3000;

const portEnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_PORT),
});

/**
 * Reads the port to listen on from the environment, defaulting to 3000.
 * Throws on startup when it is not a valid port number.
 */
export function loadPort(
  env: Record<string, string | undefined> = process.env,
): number {
  const result = portEnvSchema.safeParse(env);

  if (!result.success) {
    throw new Error("Invalid PORT: must be an integer from 1 to 65535.");
  }

  return result.data.PORT;
}
