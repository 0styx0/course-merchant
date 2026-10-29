import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type CourseFormValues } from "../course-form-schema";
import { NOW, withValues } from "./course-form-schema.fixtures";

describe("courseFormSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => vi.useRealTimers());

  describe("time zone", () => {
    it.each(["", "Mars/Olympus"])("refuses %j", (timeZone) => {
      expect(withValues((v) => (v.schedule.timeZone = timeZone))).toEqual({
        "schedule.timeZone": ["Choose a time zone."],
      });
    });

    it("reports a bad zone without a second message on the times", () => {
      const result = withValues((v) => (v.schedule.timeZone = "Mars/Olympus"));
      expect(Object.keys(result)).toEqual(["schedule.timeZone"]);
    });
  });

  describe("start and end times", () => {
    const startAt = (v: CourseFormValues, wallClock: string) => {
      [v.schedule.startDate, v.schedule.startTimeOfDay] = wallClock.split("T");
    };
    const endAt = (v: CourseFormValues, wallClock: string) => {
      [v.schedule.endDate, v.schedule.endTimeOfDay] = wallClock.split("T");
    };
    const dstMessage =
      "That time doesn't exist, or happens twice, on that day in America/New_York because of a daylight-saving change. Choose another time.";

    it("requires a date and a time for both", () => {
      expect(
        withValues((v) => {
          v.schedule.startDate = "";
          v.schedule.startTimeOfDay = "";
          v.schedule.endDate = "";
          v.schedule.endTimeOfDay = "";
        }),
      ).toEqual({
        "schedule.startDate": ["Enter a start date."],
        "schedule.startTimeOfDay": ["Enter a start time."],
        "schedule.endDate": ["Enter an end date."],
        "schedule.endTimeOfDay": ["Enter an end time."],
      });
    });

    it("requires the time when only the date is entered", () => {
      expect(withValues((v) => (v.schedule.startTimeOfDay = ""))).toEqual({
        "schedule.startTimeOfDay": ["Enter a start time."],
      });
    });

    it("refuses a start time in the past", () => {
      expect(
        withValues((v) => {
          startAt(v, "2026-06-01T11:59");
          endAt(v, "2026-06-01T13:00");
        }),
      ).toEqual({
        "schedule.startTimeOfDay": ["The start time must be in the future."],
      });
    });

    it("refuses an end time not after the start", () => {
      expect(withValues((v) => endAt(v, "2026-07-01T09:00"))).toEqual({
        "schedule.endTimeOfDay": ["The end time must be after the start time."],
      });
    });

    it("reports only the zone when it is empty", () => {
      const result = withValues((v) => {
        v.schedule.timeZone = "";
        endAt(v, "2026-07-01T08:00");
      });
      expect(result).toEqual({ "schedule.timeZone": ["Choose a time zone."] });
    });

    it("refuses a time that daylight saving skips", () => {
      expect(
        withValues((v) => {
          startAt(v, "2027-03-14T02:30");
          endAt(v, "2027-03-14T05:00");
        }),
      ).toEqual({ "schedule.startTimeOfDay": [dstMessage] });
    });

    it("refuses a time that daylight saving repeats", () => {
      expect(withValues((v) => endAt(v, "2026-11-01T01:30"))).toEqual({
        "schedule.endTimeOfDay": [dstMessage],
      });
    });

    it("refuses a date that does not exist", () => {
      expect(withValues((v) => (v.schedule.endDate = "2026-02-30"))).toEqual({
        "schedule.endTimeOfDay": ["Enter a valid date and time."],
      });
    });
  });
});
