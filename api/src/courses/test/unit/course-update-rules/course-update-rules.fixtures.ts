import { Temporal } from "@js-temporal/polyfill";

import type { UpdateCourseRequest } from "types.js";
import { descriptionDoc } from "@/test/course-fixtures.js";

export const now = Temporal.Instant.from("2026-10-21T12:00:00Z");

export function at(hoursFromNow: number): Temporal.Instant {
  return now.add({ hours: hoursFromNow });
}

export function makeStored() {
  return {
    statuses: [
      {
        name: "published" as "published" | "archived" | "drafted",
        changedAt: at(-72),
      },
    ],
    image: { updatedAt: at(-60) } as { updatedAt: Temporal.Instant } | null,
    startsAt: at(24),
    endsAt: at(26),
    prices: [
      {
        id: "price_past",
        amount: 5000,
        currency: "USD",
        effectiveAt: at(-48),
      },
      {
        id: "price_future",
        amount: 7000,
        currency: "USD",
        effectiveAt: at(12),
      },
    ],
  };
}

export type Stored = ReturnType<typeof makeStored>;

// round-trips the stored course, the way a form would after loading it
export function makeRequest(stored: Stored): UpdateCourseRequest {
  return {
    name: "TypeScript Fundamentals",
    summary: "Learn TypeScript from the ground up.",
    description: descriptionDoc("Learn TypeScript from the ground up."),
    contentUrl: "https://drive.google.com/drive/folders/typescript",
    status: "published",
    schedule: {
      startTime: stored.startsAt.toString(),
      endTime: stored.endsAt.toString(),
      timeZone: "UTC",
    },
    prices: stored.prices.map((price) => ({
      amount: price.amount,
      currency: price.currency,
      effectiveAt: price.effectiveAt.toString(),
    })),
  };
}
