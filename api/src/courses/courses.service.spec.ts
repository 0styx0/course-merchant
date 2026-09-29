import { Test, type TestingModule } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CoursesService } from "./courses.service.js";
import { CoursesRepository } from "./courses.repository/courses.repository.js";

const makeCourseRecord = (overrides = {}) => ({
  title: "React Fundamentals",
  description: "Learn React",
  startsAt: new Date("2026-10-01T18:00:00.000Z"),
  endsAt: new Date("2026-10-01T20:00:00.000Z"),
  timeZone: "America/New_York",
  price: {
    amount: 9900,
    currency: "USD",
  },
  enrollmentCount: 0,
  ...overrides,
});

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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findAll", () => {
    it("returns an empty courses array when the repository returns no courses", async () => {
      findAvailable.mockResolvedValue([]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [],
      });
    });

    it("maps a course to the expected API format", async () => {
      findAvailable.mockResolvedValue([
        makeCourseRecord(),
      ]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [
          {
            name: "React Fundamentals",
            description: "Learn React",
            enrollmentCount: 0,
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              startTime: "2026-10-01T18:00:00.000Z",
              endTime: "2026-10-01T20:00:00.000Z",
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
          title: "Course Two",
          startsAt: new Date("2026-10-02T18:00:00.000Z"),
          endsAt: new Date("2026-10-02T20:00:00.000Z"),
        }),
      ]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [
          {
            name: "Course One",
            description: "Learn React",
            enrollmentCount: 0,
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              startTime: "2026-10-01T18:00:00.000Z",
              endTime: "2026-10-01T20:00:00.000Z",
              timeZone: "America/New_York",
            },
          },
          {
            name: "Course Two",
            description: "Learn React",
            enrollmentCount: 0,
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              startTime: "2026-10-02T18:00:00.000Z",
              endTime: "2026-10-02T20:00:00.000Z",
              timeZone: "America/New_York",
            },
          },
        ],
      });
    });

    it("maps the enrollment count", async () => {
      findAvailable.mockResolvedValue([
        makeCourseRecord({
          enrollmentCount: 12,
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
          enrollmentCount: 0,
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
          price: {
            amount: 14900,
            currency: "USD",
          },
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
      findAvailable.mockResolvedValue([
        makeCourseRecord(),
      ]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [
          expect.objectContaining({
            schedule: {
              startTime: "2026-10-01T18:00:00.000Z",
              endTime: "2026-10-01T20:00:00.000Z",
              timeZone: "America/New_York",
            },
          }),
        ],
      });
    });

    it("returns exactly the public API representation", async () => {
      findAvailable.mockResolvedValue([
        makeCourseRecord(),
      ]);

      const result = await service.findAll();

      expect(result).toEqual({
        courses: [
          {
            name: "React Fundamentals",
            description: "Learn React",
            enrollmentCount: 0,
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              startTime: "2026-10-01T18:00:00.000Z",
              endTime: "2026-10-01T20:00:00.000Z",
              timeZone: "America/New_York",
            },
          },
        ],
      });
    });

    it("does not expose repository fields in the API response", async () => {
      findAvailable.mockResolvedValue([
        makeCourseRecord({
          id: "internal-course-id",
          contentUrl: "https://example.com/private-content",
          stripeProductId: "prod_internal",
          stripePriceId: "price_internal",
          archivedAt: null,
        }),
      ]);

      const result = await service.findAll();
      const course = result.courses[0];

      expect(course).not.toHaveProperty("id");
      expect(course).not.toHaveProperty("contentUrl");
      expect(course).not.toHaveProperty("stripeProductId");
      expect(course).not.toHaveProperty("stripePriceId");
      expect(course).not.toHaveProperty("archivedAt");
    });

    it("propagates repository errors", async () => {
      findAvailable.mockRejectedValue(
        new Error("database unavailable"),
      );

      await expect(service.findAll()).rejects.toThrow(
        "database unavailable",
      );
    });

    it("propagates unexpected repository errors", async () => {
      findAvailable.mockRejectedValue(
        new Error("unexpected repository failure"),
      );

      await expect(service.findAll()).rejects.toThrow(
        "unexpected repository failure",
      );
    });

    it("throws when a returned course has no price", async () => {
      findAvailable.mockResolvedValue([
        makeCourseRecord({
          price: undefined,
        }),
      ]);

      await expect(service.findAll()).rejects.toThrow();
    });
  });
});
