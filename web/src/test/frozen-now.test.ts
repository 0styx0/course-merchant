import { Temporal } from "temporal-polyfill";
import { describe, expect, it, vi } from "vitest";
import { FROZEN_NOW } from "./frozen-now";

describe("frozen test clock", () => {
  it("starts every test at 2026-11-04 12:00 UTC", () => {
    expect(new Date(Date.now()).toISOString()).toBe("2026-11-04T12:00:00.000Z");
    expect(Temporal.Now.instant().toString()).toBe("2026-11-04T12:00:00Z");
  });

  it("lets a test set its own time", () => {
    vi.setSystemTime(FROZEN_NOW + 60_000);

    expect(Date.now()).toBe(FROZEN_NOW + 60_000);
  });

  it("keeps real timers running", async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(Date.now()).toBe(FROZEN_NOW);
  });

  // These two run in file order: the second proves the setup file reset what the first set.
  it("sets a later time (first of a pair)", () => {
    vi.setSystemTime(FROZEN_NOW + 60_000);

    expect(Date.now()).toBe(FROZEN_NOW + 60_000);
  });

  it("starts at FROZEN_NOW again (second of a pair)", () => {
    expect(Date.now()).toBe(FROZEN_NOW);
  });
});
