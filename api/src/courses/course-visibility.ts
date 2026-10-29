import type { Temporal } from "@js-temporal/polyfill";
import {
  and,
  type Condition,
  type ModelAccessor,
  type WhereCallbackResult,
} from "@prisma/orm-postgres/orm-client";

import type { Contract } from "@/prisma/contract.js";
import type { DbScope } from "types.js";

type CourseCollection = DbScope["orm"]["public"]["Course"];
type CourseStatusName = "drafted" | "published" | "archived" | "deleted";
type CourseFilter = (
  course: ModelAccessor<Contract, "Course">,
) => WhereCallbackResult;
type StatusFilter = (
  status: ModelAccessor<Contract, "CourseStatus">,
) => WhereCallbackResult;

/**
 * A course's latest status is the status row that no later row of the same
 * course follows. `CourseStatus` is unique on `(courseId, changedAt)`, so
 * exactly one row qualifies. Every "latest status" check goes through here.
 */
function latestStatusMatches(matchName: StatusFilter): CourseFilter {
  return (course) =>
    course.statuses.some((status) =>
      and(
        matchName(status) as Condition,
        status.course.some((sameCourse) =>
          sameCourse.statuses.none((laterStatus) =>
            laterStatus.changedAt.gt(status.changedAt),
          ),
        ),
      ),
    );
}

function latestStatusIs(name: CourseStatusName): CourseFilter {
  return latestStatusMatches((status) => status.name.eq(name));
}

export function latestStatusIsNot(name: CourseStatusName): CourseFilter {
  return latestStatusMatches((status) => status.name.neq(name));
}

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
    .where(latestStatusIs("published"))
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
