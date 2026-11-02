import { describe, expect, it } from "vitest";

import { editScheduleIssues } from "./edit-schedule-issues";

const NOW = Date.parse("2026-06-01T12:00:00Z");
const ZONE = "America/New_York";

// Stored times, in New York: start 2026-05-01 09:00, end 2026-05-01 17:00 (both in the past).
const pastLoaded = {
  startTime: "2026-05-01T13:00:00Z",
  endTime: "2026-05-01T21:00:00Z",
};
const pastBoxes = {
  startDate: "2026-05-01",
  startTimeOfDay: "09:00",
  endDate: "2026-05-01",
  endTimeOfDay: "17:00",
  timeZone: ZONE,
};
const futureLoaded = {
  startTime: "2026-07-01T13:00:00Z",
  endTime: "2026-07-01T21:00:00Z",
};
const futureBoxes = {
  startDate: "2026-07-01",
  startTimeOfDay: "09:00",
  endDate: "2026-07-01",
  endTimeOfDay: "17:00",
  timeZone: ZONE,
};

const startMessage = {
  path: ["schedule", "startTimeOfDay"],
  message: "The start time must be in the future.",
};
const endMessage = {
  path: ["schedule", "endTimeOfDay"],
  message: "The end time must be in the future.",
};
const endAfterStartMessage = {
  path: ["schedule", "endTimeOfDay"],
  message: "The end time must be after the start time.",
};

describe("editScheduleIssues", () => {
  it("allows unchanged times that are in the past", () => {
    expect(editScheduleIssues(pastBoxes, pastLoaded, NOW)).toEqual([]);
  });

  it("allows changed times that are in the future", () => {
    expect(editScheduleIssues(futureBoxes, pastLoaded, NOW)).toEqual([]);
  });

  it("refuses a changed start in the past", () => {
    const boxes = { ...pastBoxes, startTimeOfDay: "10:00" };
    expect(editScheduleIssues(boxes, pastLoaded, NOW)).toEqual([startMessage]);
  });

  it("refuses a changed end in the past", () => {
    const boxes = { ...pastBoxes, endTimeOfDay: "18:00" };
    expect(editScheduleIssues(boxes, pastLoaded, NOW)).toEqual([endMessage]);
  });

  it("refuses a changed start exactly at the current time", () => {
    const boxes = {
      ...futureBoxes,
      startDate: "2026-06-01",
      startTimeOfDay: "08:00",
    };
    expect(editScheduleIssues(boxes, futureLoaded, NOW)).toEqual([
      startMessage,
    ]);
  });

  it("treats the times as changed when the zone moves them", () => {
    const boxes = { ...pastBoxes, timeZone: "America/Chicago" };
    expect(editScheduleIssues(boxes, pastLoaded, NOW)).toEqual([
      startMessage,
      endMessage,
    ]);
  });

  it("shows only the end-after-start message when the end is also in the past", () => {
    const boxes = { ...pastBoxes, endTimeOfDay: "08:00" };
    expect(editScheduleIssues(boxes, pastLoaded, NOW)).toEqual([
      endAfterStartMessage,
    ]);
  });

  it("refuses an end equal to the start", () => {
    const boxes = { ...futureBoxes, endTimeOfDay: "09:00" };
    expect(editScheduleIssues(boxes, futureLoaded, NOW)).toEqual([
      endAfterStartMessage,
    ]);
  });

  it("refuses a daylight-saving time even when it is unchanged", () => {
    const loaded = {
      startTime: "2026-11-01T05:30:00Z",
      endTime: "2026-11-01T20:00:00Z",
    };
    const boxes = {
      startDate: "2026-11-01",
      startTimeOfDay: "01:30",
      endDate: "2026-11-01",
      endTimeOfDay: "15:00",
      timeZone: ZONE,
    };
    const issues = editScheduleIssues(
      boxes,
      loaded,
      Date.parse("2026-12-01T00:00:00Z"),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toEqual(["schedule", "startTimeOfDay"]);
    expect(issues[0].message).toContain("daylight-saving");
  });
});
