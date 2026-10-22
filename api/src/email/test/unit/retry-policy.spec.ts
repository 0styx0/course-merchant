import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import {
  MAX_SEND_ATTEMPTS,
  nextAttemptAfterFailure,
} from "@/email/retry-policy.js";

describe("nextAttemptAfterFailure", () => {
  const now = Temporal.Instant.from("2026-01-01T00:00:00Z");
  const delaySeconds = (failedAttempts: number) =>
    now.until(nextAttemptAfterFailure(failedAttempts, now)!, {
      largestUnit: "second",
    }).seconds;

  it("waits a minute after the first failure and doubles from there", () => {
    expect([1, 2, 3, 4].map(delaySeconds)).toEqual([60, 120, 240, 480]);
  });

  it("never waits longer than an hour", () => {
    expect(delaySeconds(MAX_SEND_ATTEMPTS - 1)).toBe(3600);
  });

  it("gives up once the attempts are used up", () => {
    expect(nextAttemptAfterFailure(MAX_SEND_ATTEMPTS, now)).toBeNull();
  });
});
