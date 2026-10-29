import { Test, type TestingModule } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaService } from "@/prisma/prisma.service.js";
import { CoursesService } from "../../../courses.service.js";
import { CoursesRepository } from "../../../repositories/courses.repository.js";
import { CourseImagesRepository } from "../../../repositories/course-images.repository.js";
import { fakePrisma } from "../../../../test/test-helpers.js";
import { descriptionDoc } from "@/test/course-fixtures.js";
import { makeCourseRecord } from "@/courses/test/unit/courses.service.list/courses.service.list.fixtures.js";

describe("CoursesService", () => {
  let service: CoursesService;

  const findAvailable = vi.fn();

  const coursesRepositoryMock = {
    findAvailable,
  };

  beforeEach(async () => {
    findAvailable.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: CourseImagesRepository, useValue: {} },
        { provide: PrismaService, useValue: fakePrisma().prisma },
        {
          provide: CoursesRepository,
          useValue: coursesRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  describe("findAll", () => {
    it("maps the price", async () => {
      findAvailable.mockResolvedValue([
        makeCourseRecord({
          prices: [
            {
              amount: 14900,
              currency: "USD",
            },
          ],
        }),
      ]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [
          expect.objectContaining({
            price: {
              amount: 14900,
              currency: "USD",
            },
          }),
        ],
      });
    });

    it("uses the first currently effective price returned by the repository", async () => {
      findAvailable.mockResolvedValue([
        makeCourseRecord({
          prices: [
            {
              amount: 14900,
              currency: "USD",
            },
            {
              amount: 19900,
              currency: "USD",
            },
          ],
        }),
      ]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [
          expect.objectContaining({
            price: {
              amount: 14900,
              currency: "USD",
            },
          }),
        ],
      });
    });

    it("maps the schedule", async () => {
      findAvailable.mockResolvedValue([makeCourseRecord()]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [
          expect.objectContaining({
            schedule: {
              endTime: "2026-10-01T20:00:00Z",
              startTime: "2026-10-01T18:00:00Z",
              timeZone: "America/New_York",
            },
          }),
        ],
      });
    });

    it("returns exactly the public API representation", async () => {
      findAvailable.mockResolvedValue([makeCourseRecord()]);

      const result = await service.findAll();

      expect(result).toEqual({
        courses: [
          {
            name: "React Fundamentals",
            summary: "Learn React",
            description: descriptionDoc("Learn React"),
            id: "course-1",
            enrollmentCount: 0,
            image: { version: "1790856000000" },
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              endTime: "2026-10-01T20:00:00Z",
              startTime: "2026-10-01T18:00:00Z",
              timeZone: "America/New_York",
            },
          },
        ],
      });
    });

    it("does not expose repository fields in the API response", async () => {
      findAvailable.mockResolvedValue([
        makeCourseRecord({
          contentUrl: "https://example.com/private-content",
          stripeProductId: "prod_internal",
          stripePriceId: "price_internal",
          archivedAt: null,
        }),
      ]);

      const result = await service.findAll();
      const course = result.courses[0];

      expect(course).not.toHaveProperty("contentUrl");
      expect(course).not.toHaveProperty("stripeProductId");
      expect(course).not.toHaveProperty("stripePriceId");
      expect(course).not.toHaveProperty("archivedAt");
    });

    it("propagates repository errors", async () => {
      findAvailable.mockRejectedValue(new Error("database unavailable"));

      await expect(service.findAll()).rejects.toThrow("database unavailable");
    });

    it("not found response when a returned course has no price", async () => {
      findAvailable.mockResolvedValue([
        makeCourseRecord({
          prices: [],
        }),
      ]);

      await expect(service.findAll()).rejects.toMatchObject({
        status: 404,
        response: {
          title: "Course not found",
          code: "COURSE_NOT_FOUND",
        },
      });
    });
  });
});
