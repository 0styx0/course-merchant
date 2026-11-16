import type { AdminCourse } from "@/lib/types";

type AdminCoursePrice = AdminCourse["prices"][number];

/** When a stored price starts, in milliseconds since 1970. */
export function storedPriceStartMs({
  effectiveAt,
}: Pick<AdminCoursePrice, "effectiveAt">): number {
  return Date.parse(effectiveAt);
}

/**
 * Splits once, when the page renders, so the server and the browser agree on
 * which prices are in effect and which start later. A price that starts at
 * the render time is in effect, as the API's visibility rule counts it.
 */
export function splitPricesByStart(
  prices: AdminCourse["prices"],
  renderMs: number,
) {
  const hasStarted = (price: AdminCoursePrice) =>
    storedPriceStartMs(price) <= renderMs;
  return {
    inEffect: prices.filter(hasStarted),
    future: prices.filter((price) => !hasStarted(price)),
  };
}
