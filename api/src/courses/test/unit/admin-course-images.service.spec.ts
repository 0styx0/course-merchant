import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminCourseImagesService } from "@/courses/admin-course-images.service.js";
import { AdminCoursesRepository } from "@/courses/repositories/admin-courses.repository.js";
import { CourseImagesRepository } from "@/courses/repositories/course-images.repository.js";
import {
  instant,
  asDependency,
  fakePrisma,
  type MockMethods,
} from "@/test/test-helpers.js";

const COURSE_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("AdminCourseImagesService", () => {
  let service: AdminCourseImagesService;
  let courses: MockMethods<AdminCoursesRepository, "courseExists">;
  let images: MockMethods<CourseImagesRepository, "saveImage" | "findImage">;

  const { prisma, db } = fakePrisma();

  beforeEach(() => {
    courses = { courseExists: vi.fn<AdminCoursesRepository["courseExists"]>() };
    images = {
      saveImage: vi.fn<CourseImagesRepository["saveImage"]>(),
      findImage: vi.fn<CourseImagesRepository["findImage"]>(),
    };
    service = new AdminCourseImagesService(
      prisma,
      asDependency<AdminCoursesRepository>(courses),
      asDependency<CourseImagesRepository>(images),
    );
  });

  describe("uploadImage", () => {
    it("is COURSE_NOT_FOUND for an unknown course and saves nothing", async () => {
      courses.courseExists.mockResolvedValue(false);

      await expect(
        service.uploadImage(COURSE_ID, Buffer.from("x")),
      ).rejects.toMatchObject({ status: 404 });
      expect(images.saveImage).not.toHaveBeenCalled();
    });

    it("refuses a rejected image and saves nothing", async () => {
      courses.courseExists.mockResolvedValue(true);

      await expect(
        service.uploadImage(COURSE_ID, undefined),
      ).rejects.toMatchObject({
        errors: [{ field: "/image", code: "REQUIRED" }],
      });
      expect(images.saveImage).not.toHaveBeenCalled();
    });

    it("saves the converted WebP", async () => {
      courses.courseExists.mockResolvedValue(true);
      images.saveImage.mockResolvedValue({
        updatedAt: instant("2026-10-27T10:00:00Z"),
      });
      const jpeg = await sharp({
        create: { width: 800, height: 450, channels: 3, background: "red" },
      })
        .jpeg()
        .toBuffer();

      await service.uploadImage(COURSE_ID, jpeg);

      const [scope, courseId, bytes] = images.saveImage.mock.calls[0];
      expect(scope).toBe(db);
      expect(courseId).toBe(COURSE_ID);
      expect((await sharp(bytes).metadata()).format).toBe("webp");
    });
  });

  describe("findImageBytes", () => {
    it("returns the stored bytes", async () => {
      const bytes = new Uint8Array([1, 2]);
      images.findImage.mockResolvedValue({
        bytes,
        updatedAt: instant("2026-10-27T10:00:00Z"),
      });

      await expect(service.findImageBytes(COURSE_ID)).resolves.toBe(bytes);
    });

    it("is COURSE_IMAGE_NOT_FOUND when the course has no image", async () => {
      images.findImage.mockResolvedValue(null);
      courses.courseExists.mockResolvedValue(true);

      await expect(service.findImageBytes(COURSE_ID)).rejects.toMatchObject({
        code: "COURSE_IMAGE_NOT_FOUND",
      });
    });

    it("is COURSE_NOT_FOUND when the course does not exist", async () => {
      images.findImage.mockResolvedValue(null);
      courses.courseExists.mockResolvedValue(false);

      await expect(service.findImageBytes(COURSE_ID)).rejects.toMatchObject({
        code: "COURSE_NOT_FOUND",
      });
    });
  });
});
