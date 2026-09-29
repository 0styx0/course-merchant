import { Test, type TestingModule } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CoursesService } from "./courses.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

const NOW = new Date("2026-09-29T14:00:00.000Z");

const makeCourseRecord = (
  overrides: Record<string, unknown> = {},
) => ({
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

  const courseAll = vi.fn();

  const prismaMock = {
    db: {
      orm: {
        public: {
          Course: {
            all: courseAll,
          },
        },
      },
    },
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    courseAll.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("findAll", () => {
    it("returns an empty array when there are no courses", async () => {
      courseAll.mockResolvedValue([]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [],
      });
    });

    it("returns a course in the expected format", async () => {
      courseAll.mockResolvedValue([
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
              startTime: "2026-10-01T18:00:00-04:00",
              endTime: "2026-10-01T20:00:00-04:00",
              timeZone: "America/New_York",
            },
          },
        ],
      });
    });

    it("returns multiple courses", async () => {
      courseAll.mockResolvedValue([
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
              startTime: "2026-10-01T18:00:00-04:00",
              endTime: "2026-10-01T20:00:00-04:00",
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
              startTime: "2026-10-02T18:00:00-04:00",
              endTime: "2026-10-02T20:00:00-04:00",
              timeZone: "America/New_York",
            },
          },
        ],
      });
    });

    it("returns the enrollment count", async () => {
      courseAll.mockResolvedValue([
        makeCourseRecord({
          enrollmentCount: 12,
        }),
      ]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [
          {
            name: "React Fundamentals",
            description: "Learn React",
            enrollmentCount: 12,
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              startTime: "2026-10-01T18:00:00-04:00",
              endTime: "2026-10-01T20:00:00-04:00",
              timeZone: "America/New_York",
            },
          },
        ],
      });
    });

    it("returns zero when there are no registered users", async () => {
      courseAll.mockResolvedValue([
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

    it("returns the course price", async () => {
      courseAll.mockResolvedValue([
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

    it("returns the course schedule", async () => {
      courseAll.mockResolvedValue([
        makeCourseRecord(),
      ]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [
          expect.objectContaining({
            schedule: {
              startTime: "2026-10-01T18:00:00-04:00",
              endTime: "2026-10-01T20:00:00-04:00",
              timeZone: "America/New_York",
            },
          }),
        ],
      });
    });

    it("returns exactly the public API representation", async () => {
      courseAll.mockResolvedValue([
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
              startTime: "2026-10-01T18:00:00-04:00",
              endTime: "2026-10-01T20:00:00-04:00",
              timeZone: "America/New_York",
            },
          },
        ],
      });
    });

    it("propagates database errors", async () => {
      courseAll.mockRejectedValue(
        new Error("database unavailable"),
      );

      await expect(service.findAll()).rejects.toThrow(
        "database unavailable",
      );
    });

    it("propagates unexpected database errors", async () => {
      courseAll.mockRejectedValue(
        new Error("unexpected database failure"),
      );

      await expect(service.findAll()).rejects.toThrow(
        "unexpected database failure",
      );
    });
  });
});