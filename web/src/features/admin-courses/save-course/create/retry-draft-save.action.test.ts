import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";
import {
  updateCourseError,
  updateCourseSuccess,
  updateCourseUrl,
  updateCourseValidationFailed,
} from "@/mocks/handlers/update-course";
import { server } from "@/mocks/node";

import { retryDraftSaveAction } from "./retry-draft-save.action";
import type { CourseFormValues } from "../../validation/course-form-schema";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

const NOW = new Date("2026-06-01T12:00:00Z");

const courseId = draftedAdminCourse.id;

const validValues: CourseFormValues = {
  name: "React Fundamentals",
  summary: "Learn React.",
  description: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }],
  },
  contentUrl: "https://example.com/course",
  schedule: {
    startDate: "2026-07-15",
    startTimeOfDay: "09:00",
    endDate: "2026-07-15",
    endTimeOfDay: "17:00",
    timeZone: "America/New_York",
  },
  prices: [
    { amountDollars: "79.50", effectiveDate: "", effectiveTimeOfDay: "" },
  ],
};

function failOnAnyCall() {
  const calls = { count: 0 };
  server.use(
    http.put(updateCourseUrl, () => {
      calls.count += 1;
      return new Response(null, { status: 500 });
    }),
  );
  return calls;
}

describe("retryDraftSaveAction", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("returns the course's id", async () => {
    server.use(updateCourseSuccess);

    await expect(retryDraftSaveAction(courseId, validValues)).resolves.toEqual({
      state: "success",
      data: { courseId: draftedAdminCourse.id },
    });
  });

  it("sends the course's id and the values as a drafted course", async () => {
    let body: unknown;
    let sentId: unknown;
    server.use(
      http.put(updateCourseUrl, async ({ request, params }) => {
        body = await request.json();
        sentId = params.courseId;
        return HttpResponse.json(draftedAdminCourse);
      }),
    );

    await retryDraftSaveAction(courseId, validValues);

    expect(sentId).toBe(courseId);
    expect(body).toMatchObject({
      status: "drafted",
      name: "React Fundamentals",
    });
  });

  it("refuses an invalid course id without calling the API", async () => {
    const calls = failOnAnyCall();

    const result = await retryDraftSaveAction("not-a-uuid", validValues);

    expect(calls.count).toBe(0);
    expect(result).toMatchObject({
      state: "failure",
      error: { problem: { code: "VALIDATION_FAILED" }, fieldErrors: [] },
    });
  });

  it("refuses invalid values without calling the API", async () => {
    const calls = failOnAnyCall();

    const result = await retryDraftSaveAction(courseId, {
      ...validValues,
      name: "  ",
    });

    expect(calls.count).toBe(0);
    expect(result).toMatchObject({
      state: "failure",
      error: {
        fieldErrors: [{ path: "name", message: "Enter a course name." }],
      },
    });
  });

  it("maps the API's field errors to form paths", async () => {
    server.use(updateCourseValidationFailed);

    await expect(
      retryDraftSaveAction(courseId, validValues),
    ).resolves.toMatchObject({
      state: "failure",
      error: {
        problem: { code: "VALIDATION_FAILED" },
        fieldErrors: [
          {
            path: "schedule.endTimeOfDay",
            message: "End time must be after start time.",
          },
        ],
      },
    });
  });

  it("returns another problem with no field errors", async () => {
    server.use(updateCourseError);

    await expect(
      retryDraftSaveAction(courseId, validValues),
    ).resolves.toMatchObject({
      state: "failure",
      error: {
        problem: { code: "INTERNAL_SERVER_ERROR" },
        fieldErrors: [],
      },
    });
  });
});
