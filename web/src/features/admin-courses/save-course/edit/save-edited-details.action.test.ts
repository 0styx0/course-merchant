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
import type { FieldsSentBackUnchanged } from "../../edit-course/edit-form-prefill";
import { saveEditedDetailsAction } from "./save-edited-details.action";

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

const fieldsSentBackUnchanged: FieldsSentBackUnchanged = {
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

describe("saveEditedDetailsAction", () => {
  beforeEach(() => server.use(updateCourseSuccess));

  it("sends the checked values and the unchanged fields to the course's id", async () => {
    const sent = captureBody();

    await expect(
      saveEditedDetailsAction(courseId, validValues, fieldsSentBackUnchanged),
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
      prices: fieldsSentBackUnchanged.prices,
    });
  });

  it("leaves the start and end unchanged when the zone changes", async () => {
    const sent = captureBody();

    await saveEditedDetailsAction(
      courseId,
      { ...validValues, schedule: { timeZone: "Asia/Tokyo" } },
      fieldsSentBackUnchanged,
    );

    expect(sent.body).toMatchObject({
      schedule: {
        startTime: fieldsSentBackUnchanged.schedule.startTime,
        endTime: fieldsSentBackUnchanged.schedule.endTime,
        timeZone: "Asia/Tokyo",
      },
    });
  });

  it("refuses an invalid course id without calling the API", async () => {
    const sent = captureBody();

    const result = await saveEditedDetailsAction(
      "not-a-uuid",
      validValues,
      fieldsSentBackUnchanged,
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

    const result = await saveEditedDetailsAction(
      courseId,
      { ...validValues, name: "  " },
      fieldsSentBackUnchanged,
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
      saveEditedDetailsAction(courseId, validValues, fieldsSentBackUnchanged),
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
      saveEditedDetailsAction(courseId, validValues, fieldsSentBackUnchanged),
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
