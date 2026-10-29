import { Test, type TestingModule } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaService } from "@/prisma/prisma.service.js";
import { CoursesService } from "../../../courses.service.js";
import { CoursesRepository } from "../../../repositories/courses.repository.js";
import { CourseImagesRepository } from "../../../repositories/course-images.repository.js";
import { fakePrisma, instant } from "../../../../test/test-helpers.js";
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
            summary: "Learn React",
            description: descriptionDoc("Learn React"),
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

    it("maps multiple courses", async () => {
      findAvailable.mockResolvedValue([
        makeCourseRecord({
          title: "Course One",
        }),
        makeCourseRecord({
          id: "course-2",
          title: "Course Two",
          startsAt: instant("2026-10-02T18:00:00Z"),
          endsAt: instant("2026-10-02T20:00:00Z"),
        }),
      ]);

      await expect(service.findAll()).resolves.toEqual({
        courses: [
          {
            name: "Course One",
            id: "course-1",
            summary: "Learn React",
            description: descriptionDoc("Learn React"),
            enrollmentCount: 0,
            image: { version: "1790856000000" },
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              startTime: "2026-10-01T18:00:00Z",
              endTime: "2026-10-01T20:00:00Z",
              timeZone: "America/New_York",
            },
          },
          {
            name: "Course Two",
            id: "course-2",
            summary: "Learn React",
            description: descriptionDoc("Learn React"),
            enrollmentCount: 0,
            image: { version: "1790856000000" },
            price: {
              amount: 9900,
              currency: "USD",
            },
            schedule: {
              startTime: "2026-10-02T18:00:00Z",
              endTime: "2026-10-02T20:00:00Z",
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
            image: { version: "1790856000000" },
          }),
        ],
      });
    });
  });
});
