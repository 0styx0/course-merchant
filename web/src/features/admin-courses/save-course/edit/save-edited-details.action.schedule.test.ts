import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateCourseSuccess } from "@/mocks/handlers/update-course";
import { server } from "@/mocks/node";

import type { LoadedSchedule } from "../../validation/edit-course-form-schema";
import {
  captureBody,
  courseId,
  fieldsSentBackUnchanged,
  loadedSchedule,
  validValues,
} from "./save-edited-details.action.fixtures";
import { saveEditedDetailsAction } from "./save-edited-details.action";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

describe("saveEditedDetailsAction schedule", () => {
  beforeEach(() => server.use(updateCourseSuccess));

  it("moves the times when the zone changes", async () => {
    const sent = captureBody();
    const futureLoaded: LoadedSchedule = {
      startTime: "2099-01-01T14:00:00Z",
      endTime: "2099-01-01T22:00:00Z",
    };

    await saveEditedDetailsAction(
      courseId,
      {
        ...validValues,
        schedule: {
          timeZone: "America/Chicago",
          startDate: "2099-01-01",
          startTimeOfDay: "09:00",
          endDate: "2099-01-01",
          endTimeOfDay: "17:00",
        },
      },
      futureLoaded,
      fieldsSentBackUnchanged,
    );

    expect(sent.body).toMatchObject({
      schedule: {
        startTime: "2099-01-01T15:00:00Z",
        endTime: "2099-01-01T23:00:00Z",
        timeZone: "America/Chicago",
      },
    });
  });

  it.each([
    [
      "a changed start in the past",
      { startTimeOfDay: "08:00" },
      "schedule.startTimeOfDay",
      "The start time must be in the future.",
    ],
    [
      "a changed end in the past",
      { endTimeOfDay: "18:00" },
      "schedule.endTimeOfDay",
      "The end time must be in the future.",
    ],
    [
      "an end not after the start",
      { endTimeOfDay: "08:00" },
      "schedule.endTimeOfDay",
      "The end time must be after the start time.",
    ],
    [
      "an empty start date",
      { startDate: "" },
      "schedule.startDate",
      "Enter a start date.",
    ],
    [
      "a time skipped by a daylight-saving change",
      {
        startDate: "2099-03-08",
        startTimeOfDay: "02:30",
        endDate: "2099-03-08",
        endTimeOfDay: "05:00",
      },
      "schedule.startTimeOfDay",
      "That time doesn't exist, or happens twice, on that day in America/New_York because of a daylight-saving change. Choose another time.",
    ],
  ])(
    "refuses %s without calling the API",
    async (_name, boxes, path, message) => {
      const sent = captureBody();

      const result = await saveEditedDetailsAction(
        courseId,
        {
          ...validValues,
          schedule: { ...validValues.schedule, ...boxes },
        },
        loadedSchedule,
        fieldsSentBackUnchanged,
      );

      expect(sent.calls).toBe(0);
      expect(result).toMatchObject({
        state: "failure",
        error: {
          problem: { code: "VALIDATION_FAILED" },
          fieldErrors: [{ path, message }],
        },
      });
    },
  );
});
