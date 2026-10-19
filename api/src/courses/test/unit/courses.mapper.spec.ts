import { describe, expect, it } from "vitest";

import { instant } from "../../../test/test-helpers.js";
import type {
  CourseRepositoryModelAdmin,
} from "../../courses.repository/courses.repository.js";
import { toAdminCourseResponse } from "@/courses/courses.mapper.js";

const COURSE_ID = "crs_01HZX3";

const repositoryCourse = {
  id: COURSE_ID,
  title: "React Fundamentals",
  description: "Learn the fundamentals of React",
  startsAt: instant("2026-10-01T18:00:00.000Z"),
  endsAt: instant("2026-10-01T20:00:00.000Z"),
  timeZone: "America/New_York",

  statuses: [
    {
      name: "published",
      changedAt: instant("2026-09-29T14:00:00.000Z"),
    },
    {
      name: "archived",
      changedAt: instant("2026-09-28T14:00:00.000Z"),
    },
  ],

  prices: [
    {
      id: "price_early",
      amount: 7900,
      currency: "USD",
      effectiveAt: instant("2026-10-20T04:00:00.000Z"),
    },
    {
      id: "price_later",
      amount: 9900,
      currency: "USD",
      effectiveAt: instant("2026-11-15T05:00:00.000Z"),
    },
  ],

  enrollments: [
    {
      customer: {
        id: "customer_1",
        name: "Ada Lovelace",
        email: "ada@example.com",
      },
      payment: {
        status: "succeeded",
        amount: 7900,
        paidAt: instant("2026-09-29T15:00:00.000Z"),
      },
    },
    {
      customer: {
        id: "customer_2",
        name: "Grace Hopper",
        email: "grace@example.com",
      },
      payment: {
        status: "refunded",
        amount: 9900,
        paidAt: instant("2026-09-27T10:00:00.000Z"),
      },
    },
  ],
} satisfies CourseRepositoryModelAdmin;

describe("toAdminCourseResponse", () => {
  it("returns the correctly mapped admin course", () => {
    expect(toAdminCourseResponse(repositoryCourse)).toEqual({
      id: COURSE_ID,
      name: "React Fundamentals",
      description: "Learn the fundamentals of React",

      schedule: {
        startTime: "2026-10-01T14:00:00-04:00",
        endTime: "2026-10-01T16:00:00-04:00",
        timeZone: "America/New_York",
      },

      status: {
        name: "published",
        changedAt: "2026-09-29T10:00:00-04:00",
      },

      prices: [
        {
          id: "price_early",
          amount: 7900,
          currency: "USD",
          effectiveAt: "2026-10-20T00:00:00-04:00",
        },
        {
          id: "price_later",
          amount: 9900,
          currency: "USD",
          effectiveAt: "2026-11-15T00:00:00-05:00",
        },
      ],

      enrollments: [
        {
          customer: {
            id: "customer_1",
            name: "Ada Lovelace",
            email: "ada@example.com",
          },
          payment: {
            status: "succeeded",
            amount: 7900,
            paidAt: "2026-09-29T11:00:00-04:00",
          },
        },
        {
          customer: {
            id: "customer_2",
            name: "Grace Hopper",
            email: "grace@example.com",
          },
          payment: {
            status: "refunded",
            amount: 9900,
            paidAt: "2026-09-27T06:00:00-04:00",
          },
        },
      ],
    });
  });

  it("maps the course title to name and preserves its other details", () => {
    const result = toAdminCourseResponse(repositoryCourse);

    expect(result.id).toBe(COURSE_ID);
    expect(result.name).toBe("React Fundamentals");
    expect(result.description).toBe(
      "Learn the fundamentals of React",
    );
  });

  it("formats schedule timestamps using the course time zone", () => {
    const result = toAdminCourseResponse(repositoryCourse);

    expect(result.schedule).toEqual({
      startTime: "2026-10-01T14:00:00-04:00",
      endTime: "2026-10-01T16:00:00-04:00",
      timeZone: "America/New_York",
    });
  });

  it("maps the first status returned by the repository", () => {
    const result = toAdminCourseResponse(repositoryCourse);

    expect(result.status).toEqual({
      name: "published",
      changedAt: "2026-09-29T10:00:00-04:00",
    });
  });

  it("maps every price and preserves repository order", () => {
    const result = toAdminCourseResponse(repositoryCourse);

    expect(result.prices).toEqual([
      {
        id: "price_early",
        amount: 7900,
        currency: "USD",
        effectiveAt: "2026-10-20T00:00:00-04:00",
      },
      {
        id: "price_later",
        amount: 9900,
        currency: "USD",
        effectiveAt: "2026-11-15T00:00:00-05:00",
      },
    ]);
  });

  it("maps each customer's payment details to the corresponding enrollment", () => {
    const result = toAdminCourseResponse(repositoryCourse);

    expect(result.enrollments).toEqual([
      {
        customer: {
          id: "customer_1",
          name: "Ada Lovelace",
          email: "ada@example.com",
        },
        payment: {
          status: "succeeded",
          amount: 7900,
          paidAt: "2026-09-29T11:00:00-04:00",
        },
      },
      {
        customer: {
          id: "customer_2",
          name: "Grace Hopper",
          email: "grace@example.com",
        },
        payment: {
          status: "refunded",
          amount: 9900,
          paidAt: "2026-09-27T06:00:00-04:00",
        },
      },
    ]);
  });

  it("returns an empty enrollment list when there are no enrollments", () => {
    const course = {
      ...repositoryCourse,
      enrollments: [],
    } satisfies CourseRepositoryModelAdmin;

    const result = toAdminCourseResponse(course);

    expect(result.enrollments).toEqual([]);
  });
});