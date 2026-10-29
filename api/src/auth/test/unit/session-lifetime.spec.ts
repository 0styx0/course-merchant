import { describe, expect, it } from "vitest";

import {
  absoluteExpiresAt,
  activeSessionCutoffs,
  touchCutoff,
} from "@/auth/sessions/session-lifetime.js";
import { instant } from "@/test/test-helpers.js";

const now = instant("2026-10-26T12:00:00Z");

describe("session lifetime", () => {
  it("ends a session 7 days after it was created", () => {
    expect(absoluteExpiresAt(now).toString()).toBe("2026-11-02T12:00:00Z");
  });

  it("allows 7 days of age and 24 hours without use", () => {
    expect(activeSessionCutoffs(now)).toEqual({
      createdAfter: instant("2026-10-19T12:00:00Z"),
      usedAfter: instant("2026-10-25T12:00:00Z"),
    });
  });

  it("refreshes the last-used time after 5 minutes", () => {
    expect(touchCutoff(now).toString()).toBe("2026-10-26T11:55:00Z");
  });
});
