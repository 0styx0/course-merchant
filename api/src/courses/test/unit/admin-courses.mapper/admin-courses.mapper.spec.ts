import { describe, expect, it } from "vitest";
import { toAdminCourseResponse } from "@/courses/courses.mapper.js";
import { descriptionDoc } from "@/test/course-fixtures.js";
import {
  COURSE_ID,
  repositoryCourse,
} from "@/courses/test/unit/admin-courses.mapper/admin-courses.mapper.fixtures.js";

describe("toAdminCourseResponse", () => {
  it("returns the correctly mapped admin course", () => {
    expect(toAdminCourseResponse(repositoryCourse)).toEqual({
      id: COURSE_ID,
      name: "React Fundamentals",
      summary: "Learn the fundamentals of React",
      description: descriptionDoc("Learn the fundamentals of React"),
      contentUrl: "https://drive.google.com/drive/folders/react",

      schedule: {
        startTime: "2026-10-01T18:00:00Z",
        endTime: "2026-10-01T20:00:00Z",
        timeZone: "America/New_York",
      },

      status: {
        name: "published",
        changedAt: "2026-09-29T14:00:00Z",
      },

      image: null,

      prices: [
        {
          id: "price_early",
          amount: 7900,
          currency: "USD",
          effectiveAt: "2026-10-20T04:00:00Z",
        },
        {
          id: "price_later",
          amount: 9900,
          currency: "USD",
          effectiveAt: "2026-11-15T05:00:00Z",
        },
      ],

      enrollments: [
        {
          revokedAt: null,
          suspendedAt: null,
          emailStatus: "sent",
          customer: {
            id: "customer_1",
            name: "Ada Lovelace",
            email: "ada@example.com",
          },
          payment: {
            status: "succeeded",
            amount: 7900,
            paidAt: "2026-09-29T15:00:00Z",
          },
        },
        {
          revokedAt: "2026-09-28T09:00:00Z",
          suspendedAt: null,
          emailStatus: "failed",
          customer: {
            id: "customer_2",
            name: "Grace Hopper",
            email: "grace@example.com",
          },
          payment: {
            status: "refunded",
            amount: 9900,
            paidAt: "2026-09-27T10:00:00Z",
          },
        },
      ],
    });
  });

  it("maps the course title to name and preserves its other details", () => {
    const result = toAdminCourseResponse(repositoryCourse);

    expect(result.id).toBe(COURSE_ID);
    expect(result.name).toBe("React Fundamentals");
    expect(result.description).toEqual(
      descriptionDoc("Learn the fundamentals of React"),
    );
  });

  it("formats schedule timestamps using the course time zone", () => {
    const result = toAdminCourseResponse(repositoryCourse);

    expect(result.schedule).toEqual({
      startTime: "2026-10-01T18:00:00Z",
      endTime: "2026-10-01T20:00:00Z",
      timeZone: "America/New_York",
    });
  });

  it("maps the first status returned by the repository", () => {
    const result = toAdminCourseResponse(repositoryCourse);

    expect(result.status).toEqual({
      name: "published",
      changedAt: "2026-09-29T14:00:00Z",
    });
  });

  it("maps every price and preserves repository order", () => {
    const result = toAdminCourseResponse(repositoryCourse);

    expect(result.prices).toEqual([
      {
        id: "price_early",
        amount: 7900,
        currency: "USD",
        effectiveAt: "2026-10-20T04:00:00Z",
      },
      {
        id: "price_later",
        amount: 9900,
        currency: "USD",
        effectiveAt: "2026-11-15T05:00:00Z",
      },
    ]);
  });
});
