import { Temporal } from "@js-temporal/polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  asDependency,
  fakePrisma,
  instant,
  type MockMethods,
} from "../../../../test/test-helpers.js";
import type { CourseImagesRepository } from "../../../repositories/course-images.repository.js";
import type { CoursesRepository } from "../../../repositories/courses.repository.js";
import { CoursesService } from "../../../courses.service.js";

const NOW = instant("2026-09-29T14:00:00Z");
const COURSE_ID = "crs_01HZX3";
const BYTES = new Uint8Array([1, 2, 3]);
const UPDATED_AT = instant("2026-10-01T12:00:00Z");
const VERSION = "1790856000000";

describe("CoursesService.findImageBytes", () => {
  let service: CoursesService;
  let imagesRepository: MockMethods<CourseImagesRepository, "findVisibleImage">;

  const { prisma, db } = fakePrisma();

  beforeEach(() => {
    vi.spyOn(Temporal.Now, "instant").mockReturnValue(NOW);

    imagesRepository = {
      findVisibleImage: vi.fn<CourseImagesRepository["findVisibleImage"]>(),
    };

    service = new CoursesService(
      prisma,
      asDependency<CoursesRepository>({}),
      asDependency<CourseImagesRepository>(imagesRepository),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the bytes when the version is the current one", async () => {
    imagesRepository.findVisibleImage.mockResolvedValue({
      bytes: BYTES,
      updatedAt: UPDATED_AT,
    });

    await expect(service.findImageBytes(COURSE_ID, VERSION)).resolves.toBe(
      BYTES,
    );
    expect(imagesRepository.findVisibleImage).toHaveBeenCalledExactlyOnceWith(
      db,
      COURSE_ID,
      NOW,
    );
  });

  it("is 404 COURSE_NOT_FOUND when the course isn't visible or has no image", async () => {
    imagesRepository.findVisibleImage.mockResolvedValue(null);

    await expect(
      service.findImageBytes(COURSE_ID, VERSION),
    ).rejects.toMatchObject({
      status: 404,
      response: { code: "COURSE_NOT_FOUND" },
    });
  });

  it.each(["1790856000001", "abc", ""])(
    "is 404 COURSE_NOT_FOUND for the non-current version %j",
    async (version) => {
      imagesRepository.findVisibleImage.mockResolvedValue({
        bytes: BYTES,
        updatedAt: UPDATED_AT,
      });

      await expect(
        service.findImageBytes(COURSE_ID, version),
      ).rejects.toMatchObject({
        status: 404,
        response: { code: "COURSE_NOT_FOUND" },
      });
    },
  );
});
