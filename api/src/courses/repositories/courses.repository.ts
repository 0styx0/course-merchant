import { Injectable } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import type { DbScope } from "types.js";
import { Models } from "@/prisma/contract.js";
import { and } from "@prisma/orm-postgres/orm-client";
import { visibleCoursesWithCurrentPrice } from "../course-visibility.js";

export type CourseRepositoryModelPublic = {
  id: string;
  title: string;
  summary: string;
  description: Models.public_Course["description"];
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  timeZone: string;
  prices: {
    amount: number;
    currency: string;
  }[];
  // never the bytes. A published course always has one (see docs/courses.md)
  image: { updatedAt: Temporal.Instant } | null;
  enrollments: number;
};

@Injectable()
export class CoursesRepository {
  private publicCourseDetails(scope: DbScope, now: Temporal.Instant) {
    return visibleCoursesWithCurrentPrice(scope.orm.public.Course, now)
      .include("image", (image) => image.select("updatedAt"))
      .include("enrollments", (enrollments) =>
        // active only: not refunded and not suspended
        enrollments
          .where((enrollment) =>
            and(enrollment.revokedAt.isNull(), enrollment.suspendedAt.isNull()),
          )
          .count(),
      );
  }

  async findAvailable(
    scope: DbScope,
    now: Temporal.Instant,
  ): Promise<CourseRepositoryModelPublic[]> {
    return await this.publicCourseDetails(scope, now)
      .where((course) => course.endsAt.gt(now))
      .orderBy([(course) => course.startsAt.asc(), (course) => course.id.asc()])
      .all();
  }

  findById(
    scope: DbScope,
    courseId: string,
    now: Temporal.Instant,
  ): Promise<CourseRepositoryModelPublic | null> {
    return this.publicCourseDetails(scope, now)
      .where((course) => course.id.eq(courseId))
      .first();
  }
}
