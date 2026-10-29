import { Temporal } from "@js-temporal/polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CourseImagesRepository } from "@/courses/repositories/course-images.repository.js";
import { AdminCoursesRepository } from "@/courses/repositories/admin-courses.repository.js";
import { db } from "@/prisma/db.js";
import {
  createCourse,
  createCoursePrice,
  createPricedCourse,
  descriptionDoc,
} from "@/test/course-fixtures.js";
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
      description: descriptionDoc("Learn React"),
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

  describe("findVisibleImage", () => {
    const BYTES = new Uint8Array([7, 8, 9]);

    it("returns the image of a published course with a price in effect", async () => {
      const { course } = await createPricedCourse();
      await repository.saveImage(db, course.id, BYTES);

      const image = await repository.findVisibleImage(db, course.id, NOW);

      expect(Array.from(image!.bytes)).toEqual([7, 8, 9]);
      expect(image!.updatedAt.equals(NOW)).toBe(true);
    });

    it("returns the image of an ended course", async () => {
      const { course } = await createPricedCourse({
        startsAt: NOW.subtract({ hours: 48 }),
        endsAt: NOW.subtract({ hours: 46 }),
      });
      await repository.saveImage(db, course.id, BYTES);

      expect(
        await repository.findVisibleImage(db, course.id, NOW),
      ).not.toBeNull();
    });

    it("returns null for a course that isn't published", async () => {
      const { course } = await createPricedCourse({ status: "drafted" });
      await repository.saveImage(db, course.id, BYTES);

      expect(await repository.findVisibleImage(db, course.id, NOW)).toBeNull();
    });

    it("returns null while every price is still in the future", async () => {
      const { course } = await createPricedCourse(
        {},
        { effectiveAt: NOW.add({ hours: 1 }) },
      );

      expect(await repository.findVisibleImage(db, course.id, NOW)).toBeNull();
    });

    it("returns null for a visible course with no image", async () => {
      const course = await createCourse({
        status: "drafted",
        title: "No image",
        summary: "No image",
        description: descriptionDoc("No image"),
        startsAt: NOW.add({ hours: 24 }),
        endsAt: NOW.add({ hours: 26 }),
        timeZone: "UTC",
      });
      await createCoursePrice({
        courseId: course.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: NOW.subtract({ hours: 24 }),
      });
      await db.orm.public.CourseStatus.create({
        courseId: course.id,
        name: "published",
        changedAt: NOW.subtract({ hours: 1 }),
      });

      expect(await repository.findVisibleImage(db, course.id, NOW)).toBeNull();
    });

    it("returns null for an unknown course", async () => {
      expect(
        await repository.findVisibleImage(db, NONEXISTENT_COURSE_ID, NOW),
      ).toBeNull();
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
