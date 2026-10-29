import { createHash, randomBytes } from "node:crypto";

// 32 random bytes in base64url: 43 characters
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** 256 random bits. Only `hashSessionToken` of it is ever stored. */
export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * SHA-256 is enough for a token that is already random: there is nothing to
 * guess, so a slow hash like Argon2 would only cost time on every request.
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Lets the guard refuse a malformed header without a database query. */
export function isWellFormedSessionToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}
