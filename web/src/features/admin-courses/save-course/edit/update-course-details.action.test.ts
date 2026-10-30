import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";
import {
  updateCourseError,
  updateCourseSuccess,
  updateCourseUrl,
  updateCourseValidationFailed,
} from "@/mocks/handlers/update-course";
import { server } from "@/mocks/node";

import type { EditCourseFormValues } from "../../validation/edit-course-form-schema";
import type { KeptParts } from "../../edit-course/edit-course-start";
import { updateCourseDetailsAction } from "./update-course-details.action";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

const courseId = draftedAdminCourse.id;

const validValues: EditCourseFormValues = {
  name: "React Fundamentals",
  summary: "Learn React.",
  description: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Hi" }] },
      { type: "paragraph" },
    ],
  },
  contentUrl: "https://example.com/course",
  schedule: { timeZone: "America/New_York" },
};

const keptParts: KeptParts = {
  status: "published",
  schedule: {
    startTime: "2020-01-01T14:00:00Z",
    endTime: "2020-01-01T22:00:00Z",
  },
  prices: [
    { amount: 9900, currency: "USD", effectiveAt: "2019-12-01T00:00:00Z" },
  ],
};

function captureBody() {
  const sent: { id?: unknown; body?: unknown; calls: number } = { calls: 0 };
  server.use(
    http.put(updateCourseUrl, async ({ request, params }) => {
      sent.calls += 1;
      sent.id = params.courseId;
      sent.body = await request.json();
      return HttpResponse.json(draftedAdminCourse);
    }),
  );
  return sent;
}

describe("updateCourseDetailsAction", () => {
  beforeEach(() => server.use(updateCourseSuccess));

  it("sends the checked values and the kept parts to the course's id", async () => {
    const sent = captureBody();

    await expect(
      updateCourseDetailsAction(courseId, validValues, keptParts),
    ).resolves.toEqual({ state: "success", data: { courseId } });

    expect(sent.id).toBe(courseId);
    expect(sent.body).toEqual({
      name: "React Fundamentals",
      summary: "Learn React.",
      description: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Hi" }] },
        ],
      },
      contentUrl: "https://example.com/course",
      status: "published",
      schedule: {
        startTime: "2020-01-01T14:00:00Z",
        endTime: "2020-01-01T22:00:00Z",
        timeZone: "America/New_York",
      },
      prices: keptParts.prices,
    });
  });

  it("leaves the start and end unchanged when the zone changes", async () => {
    const sent = captureBody();

    await updateCourseDetailsAction(
      courseId,
      { ...validValues, schedule: { timeZone: "Asia/Tokyo" } },
      keptParts,
    );

    expect(sent.body).toMatchObject({
      schedule: {
        startTime: keptParts.schedule.startTime,
        endTime: keptParts.schedule.endTime,
        timeZone: "Asia/Tokyo",
      },
    });
  });

  it("refuses an invalid course id without calling the API", async () => {
    const sent = captureBody();

    const result = await updateCourseDetailsAction(
      "not-a-uuid",
      validValues,
      keptParts,
    );

    expect(sent.calls).toBe(0);
    expect(result).toEqual({
      state: "failure",
      error: {
        problem: {
          title: "Validation failed",
          detail: "The course id is not valid.",
          code: "VALIDATION_FAILED",
        },
        fieldErrors: [],
      },
    });
  });

  it("refuses invalid values without calling the API", async () => {
    const sent = captureBody();

    const result = await updateCourseDetailsAction(
      courseId,
      { ...validValues, name: "  " },
      keptParts,
    );

    expect(sent.calls).toBe(0);
    expect(result).toMatchObject({
      state: "failure",
      error: {
        problem: { code: "VALIDATION_FAILED" },
        fieldErrors: [{ path: "name", message: "Enter a course name." }],
      },
    });
  });

  it("maps the API's field errors to form paths", async () => {
    server.use(updateCourseValidationFailed);

    await expect(
      updateCourseDetailsAction(courseId, validValues, keptParts),
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

  it("returns the API's own title and detail for a server error", async () => {
    server.use(updateCourseError);

    await expect(
      updateCourseDetailsAction(courseId, validValues, keptParts),
    ).resolves.toEqual({
      state: "failure",
      error: {
        problem: {
          title: "Internal server error",
          detail:
            "We couldn't save this course right now. Please try again later.",
          code: "INTERNAL_SERVER_ERROR",
        },
        fieldErrors: [],
      },
    });
  });
});
