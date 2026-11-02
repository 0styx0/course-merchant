import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  updateCourseError,
  updateCourseSuccess,
  updateCourseValidationFailed,
} from "@/mocks/handlers/update-course";
import { server } from "@/mocks/node";

import {
  captureBody,
  courseId,
  loadedPrices,
  loadedSchedule,
  validValues,
} from "./save-edited-details.action.fixtures";
import { saveEditedDetailsAction } from "./save-edited-details.action";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

describe("saveEditedDetailsAction", () => {
  beforeEach(() => server.use(updateCourseSuccess));

  it("sends the checked values to the course's id", async () => {
    const sent = captureBody();

    await expect(
      saveEditedDetailsAction(
        courseId,
        validValues,
        loadedSchedule,
        loadedPrices,
      ),
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
      prices: loadedPrices.inEffect,
    });
  });

  it("sends the status from the values", async () => {
    const sent = captureBody();

    await saveEditedDetailsAction(
      courseId,
      { ...validValues, status: "archived" },
      loadedSchedule,
      loadedPrices,
    );

    expect(sent.body).toMatchObject({ status: "archived" });
  });

  it("refuses a status the API doesn't know without calling the API", async () => {
    const sent = captureBody();

    const result = await saveEditedDetailsAction(
      courseId,
      // @ts-expect-error a caller can send any value to a Server Action
      { ...validValues, status: "hidden" },
      loadedSchedule,
      loadedPrices,
    );

    expect(sent.calls).toBe(0);
    expect(result).toMatchObject({
      state: "failure",
      error: { fieldErrors: [{ path: "status" }] },
    });
  });

  it("refuses an invalid course id without calling the API", async () => {
    const sent = captureBody();

    const result = await saveEditedDetailsAction(
      "not-a-uuid",
      validValues,
      loadedSchedule,
      loadedPrices,
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
      loadedSchedule,
      loadedPrices,
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
      saveEditedDetailsAction(
        courseId,
        validValues,
        loadedSchedule,
        loadedPrices,
      ),
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
      saveEditedDetailsAction(
        courseId,
        validValues,
        loadedSchedule,
        loadedPrices,
      ),
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
