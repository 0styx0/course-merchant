import { afterEach, describe, expect, it, vi } from "vitest";

import { readRequestTime } from "./read-request-time";

describe("readRequestTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current time in milliseconds since 1970", () => {
    vi.useFakeTimers({ now: Date.parse("2026-11-16T12:00:00Z") });

    expect(readRequestTime()).toBe(Date.parse("2026-11-16T12:00:00Z"));
  });
});
