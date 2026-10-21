import type { Temporal } from "@js-temporal/polyfill";
import { and } from "@prisma/orm-postgres/orm-client";

import type { DbScope } from "types.js";

type CourseCollection = DbScope["orm"]["public"]["Course"];

/**
 * Courses the public can see and buy, each with only its current price.
 * Shared by browsing and checkout so the two can't disagree about which
 * courses are on sale or what they cost.
 *
 * Visible: the latest status is `published` and a price has taken effect.
 * Current price: the latest one whose `effectiveAt` has passed.
 */
export function visibleCoursesWithCurrentPrice(
  courses: CourseCollection,
  now: Temporal.Instant,
) {
  return courses
    .where((course) =>
      course.statuses.some((status) =>
        and(
          status.name.eq("published"),
          status.course.some((sameCourse) =>
            sameCourse.statuses.none((laterStatus) =>
              laterStatus.changedAt.gt(status.changedAt),
            ),
          ),
        ),
      ),
    )
    .where((course) =>
      course.prices.some((price) => price.effectiveAt.lte(now)),
    )
    .include("prices", (prices) =>
      prices
        .where((price) => price.effectiveAt.lte(now))
        .orderBy((price) => price.effectiveAt.desc())
        .limit(1),
    );
}
