import { Test, type TestingModule } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CoursesService } from "../../courses.service.js";
import { CourseRepositoryModel, CoursesRepository } from "../../courses.repository/courses.repository.js";
import { instant } from "../../../test/test-helpers.js";

const makeCourseRecord = (overrides = {}) => ({
  id: "course-1",
  title: "React Fundamentals",
  description: "Learn React",
  startsAt: instant("2026-10-01T18:00:00.000Z"),
  endsAt: instant("2026-10-01T20:00:00.000Z"),
  timeZone: "America/New_York",
  prices: [
    {
      amount: 9900,
      currency: "USD",
    },
  ],
  enrollments: 0,
  ...overrides,
} satisfies CourseRepositoryModel);

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
        {
          provide: CoursesRepository,
          useValue: coursesRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  describe("findAll", () => {
    it("returns an empty courses array when the repository returns no courses", async () => {
      findAvailable.mockResolvedValue([]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [],
      });
    });

    it("maps a course to the expected API format", async () => {
      findAvailable.mockResolvedValue([makeCourseRecord()]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [
          {
            name: "React Fundamentals",
            id: "course-1",
            description: "Learn React",
            enrollmentCount: 0,
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              endTime: "2026-10-01T16:00:00-04:00",
              startTime: "2026-10-01T14:00:00-04:00",
              timeZone: "America/New_York",
            },
          },
        ],
      });
    });

    it("maps multiple courses", async () => {
      findAvailable.mockResolvedValue([
        makeCourseRecord({
          title: "Course One",
        }),
        makeCourseRecord({
          id: "course-2",
          title: "Course Two",
          startsAt: instant("2026-10-02T18:00:00.000Z"),
          endsAt: instant("2026-10-02T20:00:00.000Z"),
        }),
      ]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [
          {
            name: "Course One",
            id: "course-1",
            description: "Learn React",
            enrollmentCount: 0,
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              startTime: "2026-10-01T14:00:00-04:00",
              endTime: "2026-10-01T16:00:00-04:00",
              timeZone: "America/New_York",
            },
          },
          {
            name: "Course Two",
            id: "course-2",
            description: "Learn React",
            enrollmentCount: 0,
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              startTime: "2026-10-02T14:00:00-04:00",
              endTime: "2026-10-02T16:00:00-04:00",
              timeZone: "America/New_York",
            },
          },
        ],
      });
    });

    it("maps the enrollment count", async () => {
      findAvailable.mockResolvedValue([
        makeCourseRecord({
          enrollments: 12,
        }),
      ]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [
          expect.objectContaining({
            enrollmentCount: 12,
          }),
        ],
      });
    });

    it("maps zero enrollments", async () => {
      findAvailable.mockResolvedValue([
        makeCourseRecord({
          enrollments: 0,
        }),
      ]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [
          expect.objectContaining({
            enrollmentCount: 0,
          }),
        ],
      });
    });

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
              endTime: "2026-10-01T16:00:00-04:00",
              startTime: "2026-10-01T14:00:00-04:00",
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
            description: "Learn React",
            id: "course-1",
            enrollmentCount: 0,
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              endTime: "2026-10-01T16:00:00-04:00",
              startTime: "2026-10-01T14:00:00-04:00",
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

      await expect(service.findAll()).rejects.toThrow(
        "database unavailable",
      );
    });

    it("throws when a returned course has no price", async () => {
      findAvailable.mockResolvedValue([
        makeCourseRecord({
          prices: [],
        }),
      ]);

      await expect(service.findAll()).rejects.toThrow(
        "Course has no currently effective price: course-1",
      );
    });
  });
});
