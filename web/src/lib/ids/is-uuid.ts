import { z } from "zod";

const uuidSchema = z.uuid();

/** True when the text is a UUID, the form every API id takes. */
export function isUuid(candidate: string): boolean {
  return uuidSchema.safeParse(candidate).success;
}
