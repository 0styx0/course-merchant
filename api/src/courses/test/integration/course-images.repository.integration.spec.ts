import { Temporal } from "@js-temporal/polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CourseImagesRepository } from "@/courses/courses.repository/course-images.repository.js";
import { AdminCoursesRepository } from "@/courses/courses.repository/admin-courses.repository.js";
import { db } from "@/prisma/db.js";
import { createCourse } from "@/test/course-fixtures.js";
import { instant } from "@/test/test-helpers.js";

const NOW = instant("2026-09-29T14:00:00Z");
const NONEXISTENT_COURSE_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("CourseImagesRepository (integration)", () => {
  const repository = new CourseImagesRepository();

  let courseId: string;

  beforeEach(async () => {
    vi.spyOn(Temporal.Now, "instant").mockReturnValue(NOW);

    const course = await createCourse({
      status: "drafted",
      title: "React Fundamentals",
      summary: "Learn React",
      description: "Learn React",
      startsAt: NOW.add({ hours: 24 }),
      endsAt: NOW.add({ hours: 26 }),
      timeZone: "UTC",
    });

    courseId = course.id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("saveImage", () => {
    it("inserts the first image and returns only its updatedAt", async () => {
      const saved = await repository.saveImage(
        db,
        courseId,
        new Uint8Array([1, 2, 3]),
      );

      expect(saved).toEqual({ updatedAt: NOW });
      expect(saved).not.toHaveProperty("bytes");
    });

    it("replaces the bytes and moves updatedAt on a second save", async () => {
      await repository.saveImage(db, courseId, new Uint8Array([1, 2, 3]));
      const later = NOW.add({ minutes: 5 });
      vi.spyOn(Temporal.Now, "instant").mockReturnValue(later);

      const saved = await repository.saveImage(
        db,
        courseId,
        new Uint8Array([9, 8]),
      );

      expect(saved.updatedAt.equals(later)).toBe(true);
      const stored = await repository.findImage(db, courseId);
      expect(Array.from(stored!.bytes)).toEqual([9, 8]);
      expect(stored!.updatedAt.equals(later)).toBe(true);
      expect(await db.orm.public.CourseImage.all()).toHaveLength(1);
    });

    it("fails for a course that does not exist", async () => {
      await expect(
        repository.saveImage(db, NONEXISTENT_COURSE_ID, new Uint8Array([1])),
      ).rejects.toThrow();
    });
  });

  describe("findImage", () => {
    it("returns the stored bytes and updatedAt", async () => {
      await repository.saveImage(db, courseId, new Uint8Array([4, 5, 6]));

      const stored = await repository.findImage(db, courseId);

      expect(Array.from(stored!.bytes)).toEqual([4, 5, 6]);
      expect(stored!.updatedAt.equals(NOW)).toBe(true);
    });

    it("returns null for a course without an image", async () => {
      expect(await repository.findImage(db, courseId)).toBeNull();
    });
  });

  it("keeps the bytes out of course queries", async () => {
    await repository.saveImage(db, courseId, new Uint8Array([1, 2, 3]));

    const course =
      await new AdminCoursesRepository().findCourseDetailsByIdAdmin(
        db,
        courseId,
      );

    expect(Object.keys(course!.image!)).toEqual(["updatedAt"]);
  });
});
