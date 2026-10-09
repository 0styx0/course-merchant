import { AppModule } from "@/app.module.js";
import { configureApp } from "@/configure-app.js";
import {
  archiveCourse,
  createCourse,
  createPricedCourse,
} from "@/test/course-fixtures.js";
import { instant } from "../../test-helpers.js";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Temporal } from "@js-temporal/polyfill";
import request from "supertest";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const NOW = Temporal.Instant.from("2026-09-29T14:00:00Z");

describe("GET /v1/courses (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    vi.spyOn(Temporal.Now, "instant").mockReturnValue(NOW);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it("returns available courses in ascending start-time order", async () => {
    const earlier = await createPricedCourse(
      {
        title: "React Fundamentals",
        description: "Learn the fundamentals of React.",
        startsAt: instant("2026-10-01T14:00:00Z"),
        endsAt: instant("2026-10-01T16:00:00Z"),
        timeZone: "America/New_York",
      },
      {
        amount: 9900,
        currency: "USD",
        effectiveAt: instant("2026-01-01T00:00:00Z"),
      },
    );

    const later = await createPricedCourse(
      {
        title: "TypeScript Essentials",
        description: "Learn TypeScript fundamentals.",
        startsAt: instant("2026-10-02T14:00:00Z"),
        endsAt: instant("2026-10-02T16:00:00Z"),
        timeZone: "America/New_York",
      },
      {
        amount: 4900,
        currency: "USD",
        effectiveAt: instant("2026-01-01T00:00:00Z"),
      },
    );

    const response = await request(app.getHttpServer())
      .get("/v1/courses")
      .expect("Content-Type", /^application\/json(?:;|$)/)
      .expect(200);

    expect(response.body).toEqual({
      courses: expect.arrayContaining([
        {
          id: earlier.course.id,
          name: "React Fundamentals",
          description: "Learn the fundamentals of React.",
          enrollmentCount: 0,
          price: {
            amount: 9900,
            currency: "USD",
          },
          schedule: {
            startTime: "2026-10-01T10:00:00-04:00",
            endTime: "2026-10-01T12:00:00-04:00",
            timeZone: "America/New_York",
          },
        },
        {
          id: later.course.id,
          name: "TypeScript Essentials",
          description: "Learn TypeScript fundamentals.",
          enrollmentCount: 0,
          price: {
            amount: 4900,
            currency: "USD",
          },
          schedule: {
            startTime: "2026-10-02T10:00:00-04:00",
            endTime: "2026-10-02T12:00:00-04:00",
            timeZone: "America/New_York",
          },
        },
      ]),
    });

    const courses = response.body.courses as {
      id: string;
      schedule: { startTime: string };
    }[];

    const courseIds = courses.map((course) => course.id);

    expect(courseIds.indexOf(earlier.course.id)).toBeLessThan(
      courseIds.indexOf(later.course.id),
    );

    const startTimes = courses.map((course) =>
      Date.parse(course.schedule.startTime),
    );

    expect(startTimes).toEqual(
      [...startTimes].sort((a, b) => a - b),
    );
  });

  it("excludes ended, archived, and unpriced courses", async () => {
    const available = await createPricedCourse(
      {
        title: "Available Course",
        description: "This course should appear.",
        startsAt: instant("2026-10-15T14:00:00Z"),
        endsAt: instant("2026-10-15T16:00:00Z"),
        timeZone: "America/New_York",
      },
      {
        amount: 2500,
        currency: "USD",
        effectiveAt: instant("2026-01-01T00:00:00Z"),
      },
    );

    const ended = await createPricedCourse(
      {
        title: "Ended Course",
        description: "This course has ended.",
        startsAt: instant("2026-09-25T14:00:00Z"),
        endsAt: instant("2026-09-26T16:00:00Z"),
        timeZone: "America/New_York",
      },
      {
        amount: 2500,
        currency: "USD",
        effectiveAt: instant("2026-01-01T00:00:00Z"),
      },
    );

    const archived = await createPricedCourse(
      {
        title: "Archived Course",
        description: "This course is archived.",
        startsAt: instant("2026-10-17T14:00:00Z"),
        endsAt: instant("2026-10-17T16:00:00Z"),
        timeZone: "America/New_York",
      },
      {
        amount: 2500,
        currency: "USD",
        effectiveAt: instant("2026-01-01T00:00:00Z"),
      },
    );

    await archiveCourse(archived.course.id, NOW);

    const unpriced = await createCourse({
      title: "Unpriced Course",
      description: "This course has no price.",
      startsAt: instant("2026-10-18T14:00:00Z"),
      endsAt: instant("2026-10-18T16:00:00Z"),
      timeZone: "America/New_York",
    });

    const futurePriced = await createPricedCourse(
      {
        title: "Future-Priced Course",
        description: "Its price is not effective yet.",
        startsAt: instant("2026-10-19T14:00:00Z"),
        endsAt: instant("2026-10-19T16:00:00Z"),
        timeZone: "America/New_York",
      },
      {
        amount: 2500,
        currency: "USD",
        effectiveAt: instant("2026-10-01T00:00:00Z"),
      },
    );

    const response = await request(app.getHttpServer())
      .get("/v1/courses")
      .expect("Content-Type", /^application\/json(?:;|$)/)
      .expect(200);

    const courses = response.body.courses as { id: string }[];
    const courseIds = courses.map((course) => course.id);

    expect(courses).toContainEqual({
      id: available.course.id,
      name: "Available Course",
      description: "This course should appear.",
      enrollmentCount: 0,
      price: {
        amount: 2500,
        currency: "USD",
      },
      schedule: {
        startTime: "2026-10-15T10:00:00-04:00",
        endTime: "2026-10-15T12:00:00-04:00",
        timeZone: "America/New_York",
      },
    });

    expect(courseIds).not.toContain(ended.course.id);
    expect(courseIds).not.toContain(archived.course.id);
    expect(courseIds).not.toContain(unpriced.id);
    expect(courseIds).not.toContain(futurePriced.course.id);
  });
});