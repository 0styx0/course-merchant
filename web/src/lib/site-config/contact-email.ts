import { z } from "zod";

/** Returns the address when it is set and valid, and throws a message naming `CONTACT_EMAIL` otherwise. */
export function validateContactEmail(value: string | undefined): string {
  if (!value) throw new Error("CONTACT_EMAIL is not configured");
  if (!z.email().safeParse(value).success) {
    throw new Error("CONTACT_EMAIL is not a valid email address");
  }
  return value;
}

let address: string | undefined;

/**
 * Reads and checks `CONTACT_EMAIL` on first use, then remembers it.
 * `instrumentation-node.ts` calls it at boot so a bad setting stops the server.
 */
export function contactEmail(): string {
  address ??= validateContactEmail(process.env.CONTACT_EMAIL);
  return address;
}
