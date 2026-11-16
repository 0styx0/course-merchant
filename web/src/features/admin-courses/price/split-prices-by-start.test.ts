import { describe, expect, it } from "vitest";

import type { AdminCourse } from "@/lib/types";

import {
  splitPricesByStart,
  storedPriceStartMs,
} from "./split-prices-by-start";

const renderMs = Date.parse("2026-10-15T12:00:00.000Z");

function priceStartingAt(id: string, effectiveAt: string) {
  return {
    id,
    amount: 9900,
    currency: "USD",
    effectiveAt,
  } as const satisfies AdminCourse["prices"][number];
}

describe("splitPricesByStart", () => {
  it("puts started prices in effect and later ones in the future, ids kept", () => {
    const started = priceStartingAt("p1", "2026-10-01T00:00:00.000Z");
    const later = priceStartingAt("p2", "2026-11-01T00:00:00.000Z");

    expect(splitPricesByStart([started, later], renderMs)).toEqual({
      inEffect: [started],
      future: [later],
    });
  });

  it("counts a price that starts exactly at the render time as in effect", () => {
    const atRender = priceStartingAt("p1", "2026-10-15T12:00:00.000Z");

    expect(splitPricesByStart([atRender], renderMs)).toEqual({
      inEffect: [atRender],
      future: [],
    });
  });

  it("puts a price that starts one millisecond after the render in the future", () => {
    const justAfter = priceStartingAt("p1", "2026-10-15T12:00:00.001Z");

    expect(splitPricesByStart([justAfter], renderMs)).toEqual({
      inEffect: [],
      future: [justAfter],
    });
  });

  it("gives two empty lists for a course with no prices", () => {
    expect(splitPricesByStart([], renderMs)).toEqual({
      inEffect: [],
      future: [],
    });
  });
});

describe("storedPriceStartMs", () => {
  it("reads the start as milliseconds", () => {
    expect(
      storedPriceStartMs({ effectiveAt: "2026-10-15T12:00:00.000Z" }),
    ).toBe(renderMs);
  });
});
