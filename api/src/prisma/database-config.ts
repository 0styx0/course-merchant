import "dotenv/config.js";
import { z } from "zod";

// the database is on this machine, so nobody can sit between us and it
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// the modes that never fall back to plain text
const ENCRYPTED_SSL_MODES = new Set(["require", "verify-ca", "verify-full"]);

/**
 * True for a database on this machine (a URL with no host is a Unix socket),
 * or one whose `sslmode` always encrypts. An unparsable URL passes here and is
 * reported by its own check.
 */
function isLocalOrEncrypted(value: string): boolean {
  if (!URL.canParse(value)) {
    return true;
  }

  const url = new URL(value);
  const isLocal = url.hostname === "" || LOOPBACK_HOSTS.has(url.hostname);

  return (
    isLocal || ENCRYPTED_SSL_MODES.has(url.searchParams.get("sslmode") ?? "")
  );
}

const databaseEnvSchema = z.object({
  // e.g. postgres://user:pass@localhost:5432/merchant
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "must be a postgres:// or postgresql:// URL")
    .refine((value) => URL.canParse(value), "must be a valid URL")
    .refine(
      isLocalOrEncrypted,
      "must end in ?sslmode=require (or verify-ca, verify-full) for a database on another machine",
    ),
});

/**
 * Reads the database URL from the environment. Throws on startup when it is
 * missing, malformed, or reaches another machine without encryption, naming
 * the variable but never echoing its value (the URL holds a password).
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
