import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import {
  formatOptionalDate,
  toEnrollmentTimesResponse,
} from "@/enrollments/enrollment-times-response.js";

const purchasedAt = Temporal.Instant.from("2026-10-21T12:00:00Z");
const revokedAt = Temporal.Instant.from("2026-10-22T08:30:00Z");
const suspendedAt = Temporal.Instant.from("2026-10-23T17:45:00Z");

describe("toEnrollmentTimesResponse", () => {
  it("sends the purchase time as enrolledAt, and set revoke and suspend times, as UTC text", () => {
    const times = toEnrollmentTimesResponse({
      purchasedAt,
      revokedAt,
      suspendedAt,
    });

    expect(times).toEqual({
      enrolledAt: "2026-10-21T12:00:00Z",
      revokedAt: "2026-10-22T08:30:00Z",
      suspendedAt: "2026-10-23T17:45:00Z",
    });
  });

  it("keeps unset revoke and suspend times as null", () => {
    const times = toEnrollmentTimesResponse({
      purchasedAt,
      revokedAt: null,
      suspendedAt: null,
    });

    expect(times).toEqual({
      enrolledAt: "2026-10-21T12:00:00Z",
      revokedAt: null,
      suspendedAt: null,
    });
  });
});

describe("formatOptionalDate", () => {
  it("keeps null as null", () => {
    expect(formatOptionalDate(null)).toBeNull();
  });

  it("sends a time as its UTC text", () => {
    expect(formatOptionalDate(revokedAt)).toBe("2026-10-22T08:30:00Z");
  });
});
