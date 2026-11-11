import { describe, expect, it } from "vitest";

import { utcToWallClock, wallClockToUtc } from "./wall-clock-time";

describe("wallClockToUtc", () => {
  it("converts a winter time (UTC-5 in New York)", () => {
    expect(wallClockToUtc("2026-01-15T09:00", "America/New_York")).toEqual({
      state: "success",
      data: "2026-01-15T14:00:00Z",
    });
  });

  it("converts a summer time (UTC-4 in New York)", () => {
    expect(wallClockToUtc("2026-07-15T09:00", "America/New_York")).toEqual({
      state: "success",
      data: "2026-07-15T13:00:00Z",
    });
  });

  it("converts in a zone east of UTC", () => {
    expect(wallClockToUtc("2026-07-15T09:00", "Asia/Tokyo")).toEqual({
      state: "success",
      data: "2026-07-15T00:00:00Z",
    });
  });

  it("refuses a time the clock skips when daylight saving starts", () => {
    expect(wallClockToUtc("2026-03-08T02:30", "America/New_York")).toEqual({
      state: "failure",
      error: "daylight-saving",
    });
  });

  it("refuses a time that happens twice when daylight saving ends", () => {
    expect(wallClockToUtc("2026-11-01T01:30", "America/New_York")).toEqual({
      state: "failure",
      error: "daylight-saving",
    });
  });

  it("refuses an unknown time zone", () => {
    expect(wallClockToUtc("2026-07-15T09:00", "Mars/Olympus")).toEqual({
      state: "failure",
      error: "unknown-zone",
    });
  });

  it.each([
    "",
    "not a time",
    "2026-02-30T10:00",
    "2026-07-01",
    "2026-07-01T10",
  ])("refuses %j as an invalid time", (text) => {
    expect(wallClockToUtc(text, "America/New_York")).toEqual({
      state: "failure",
      error: "invalid-time",
    });
  });
});

describe("utcToWallClock", () => {
  it("shows a winter time in New York (UTC-5)", () => {
    expect(utcToWallClock("2026-01-15T14:00:00Z", "America/New_York")).toEqual({
      date: "2026-01-15",
      timeOfDay: "09:00",
    });
  });

  it("shows a time in a zone east of UTC", () => {
    expect(utcToWallClock("2026-07-15T00:00:00Z", "Asia/Tokyo")).toEqual({
      date: "2026-07-15",
      timeOfDay: "09:00",
    });
  });

  it("moves to the previous day when the zone is behind UTC", () => {
    expect(utcToWallClock("2026-01-15T03:30:00Z", "America/New_York")).toEqual({
      date: "2026-01-14",
      timeOfDay: "22:30",
    });
  });

  it("shows the repeated daylight-saving hour without refusing it", () => {
    expect(utcToWallClock("2026-11-01T06:30:00Z", "America/New_York")).toEqual({
      date: "2026-11-01",
      timeOfDay: "01:30",
    });
  });

  it("returns nothing for an unknown zone", () => {
    expect(utcToWallClock("2026-07-15T09:00:00Z", "Mars/Olympus")).toBe(
      undefined,
    );
  });

  it("returns nothing for text that is not a UTC time", () => {
    expect(utcToWallClock("not a time", "America/New_York")).toBe(undefined);
  });
});
