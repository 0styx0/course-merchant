import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";
import {
  createCourseError,
  createCourseSuccess,
  createCourseUrl,
  createCourseValidationFailed,
} from "@/mocks/handlers/admin-courses/create-course";
import { server } from "@/mocks/server";

import { createCourseAction } from "./create-course.action";
import type { CourseFormValues } from "../../validation/course-form-schema";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

const validValues: CourseFormValues = {
  name: "React Fundamentals",
  summary: "Learn React.",
  description: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }],
  },
  contentUrl: "https://example.com/course",
  schedule: {
    startDate: "2027-07-15",
    startTimeOfDay: "09:00",
    endDate: "2027-07-15",
    endTimeOfDay: "17:00",
    timeZone: "America/New_York",
  },
  prices: [
    { amountDollars: "79.50", effectiveDate: "", effectiveTimeOfDay: "" },
  ],
};

describe("createCourseAction", () => {
  it("returns the new course's id", async () => {
    server.use(createCourseSuccess);

    await expect(createCourseAction(validValues)).resolves.toEqual({
      state: "success",
      data: { courseId: draftedAdminCourse.id },
    });
  });

  it("sends the request as a drafted course", async () => {
    let body: unknown;
    server.use(
      http.post(createCourseUrl, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(draftedAdminCourse, { status: 201 });
      }),
    );

    await createCourseAction(validValues);

    expect(body).toMatchObject({
      status: "drafted",
      name: "React Fundamentals",
    });
  });

  it("maps the API's field errors to form paths", async () => {
    server.use(createCourseValidationFailed);

    const result = await createCourseAction(validValues);

    expect(result).toMatchObject({
      state: "failure",
      error: {
        problem: { code: "VALIDATION_FAILED" },
        fieldErrors: [
          {
            path: "prices.0.amountDollars",
            message: "Price must either be free or cost at least 0.50.",
          },
          {
            path: "schedule.endTimeOfDay",
            message: "End time must be after start time.",
          },
        ],
      },
    });
  });

  it("returns another problem with no field errors", async () => {
    server.use(createCourseError);

    await expect(createCourseAction(validValues)).resolves.toMatchObject({
      state: "failure",
      error: {
        problem: { code: "INTERNAL_SERVER_ERROR" },
        fieldErrors: [],
      },
    });
  });

  it("refuses invalid input without calling the API", async () => {
    let wasCalled = false;
    server.use(
      http.post(createCourseUrl, () => {
        wasCalled = true;
        return new Response(null, { status: 500 });
      }),
    );

    const result = await createCourseAction({ ...validValues, name: "  " });

    expect(wasCalled).toBe(false);
    expect(result).toMatchObject({
      state: "failure",
      error: {
        fieldErrors: [{ path: "name", message: "Enter a course name." }],
      },
    });
  });
});
