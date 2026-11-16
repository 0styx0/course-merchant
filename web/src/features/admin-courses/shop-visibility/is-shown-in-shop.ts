import type { AdminCourse } from "@/lib/types";

/**
 * The shop lists a published course that has at least one price in effect.
 * This mirrors the API's visibility rule, `visibleCoursesWithCurrentPrice` in
 * api/src/courses/course-visibility.ts; a change to one changes both.
 */
export function isShownInShop(
  statusName: AdminCourse["status"]["name"],
  pricesInEffectCount: number,
): boolean {
  return statusName === "published" && pricesInEffectCount > 0;
}
