import { Injectable } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";

import type { DbScope } from "types.js";
import { visibleCoursesWithCurrentPrice } from "../course-visibility.js";

export type StoredCourseImage = {
  bytes: Uint8Array;
  updatedAt: Temporal.Instant;
};

/**
 * Stores each course's one image. Images are never deleted. This is the only
 * code that reads `bytes`: course queries select just `updatedAt`.
 */
@Injectable()
export class CourseImagesRepository {
  /**
   * Inserts the course's image, or replaces it when it already has one.
   * Returns the new `updatedAt` and never the bytes.
   */
  async saveImage(
    scope: DbScope,
    courseId: string,
    bytes: Uint8Array,
  ): Promise<{ updatedAt: Temporal.Instant }> {
    // a version, never compared with a column Postgres fills in, so it
    // doesn't need DatabaseClock
    const updatedAt = Temporal.Now.instant();

    return scope.orm.public.CourseImage.select("updatedAt").upsert({
      create: { courseId, bytes, updatedAt },
      update: { bytes, updatedAt },
      conflictOn: { courseId },
    });
  }

  /**
   * The image of a course the public can see (see `course-visibility.ts`), or
   * null when the course isn't visible or has no image.
   */
  async findVisibleImage(
    scope: DbScope,
    courseId: string,
    now: Temporal.Instant,
  ): Promise<StoredCourseImage | null> {
    const course = await visibleCoursesWithCurrentPrice(
      scope.orm.public.Course,
      now,
    )
      .where((course) => course.id.eq(courseId))
      .select("id")
      .include("image", (image) => image.select("bytes", "updatedAt"))
      .first();

    return course?.image ?? null;
  }

  async findImage(
    scope: DbScope,
    courseId: string,
  ): Promise<StoredCourseImage | null> {
    return scope.orm.public.CourseImage.select("bytes", "updatedAt")
      .where((image) => image.courseId.eq(courseId))
      .first();
  }
}
