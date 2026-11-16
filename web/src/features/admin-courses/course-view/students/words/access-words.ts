import type { AdminCourse } from "@/lib/types";

type AccessDates = Pick<
  AdminCourse["enrollments"][number],
  "suspendedAt" | "revokedAt"
>;

/** A student's access as the admin page names and colours it. */
export type StudentAccess =
  | { word: "Active"; colourPair: "success" }
  | { word: "Suspended"; colourPair: "muted"; suspendedAt: string }
  | { word: "Un-enrolled"; colourPair: "muted" };

/**
 * Active, Suspended or Un-enrolled from the enrollment's two dates. A
 * suspension outranks an un-enroll, as the API's enrollment-access.ts does.
 */
export function studentAccess({
  suspendedAt,
  revokedAt,
}: AccessDates): StudentAccess {
  if (suspendedAt !== null) {
    return { word: "Suspended", colourPair: "muted", suspendedAt };
  }
  if (revokedAt !== null) {
    return { word: "Un-enrolled", colourPair: "muted" };
  }
  return { word: "Active", colourPair: "success" };
}
