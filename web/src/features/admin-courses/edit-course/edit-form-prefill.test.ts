import { describe, expect, it } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";
import type { AdminCourse } from "@/lib/types";

import { toEditFormPrefill } from "./edit-form-prefill";

const enrollment = {
  revokedAt: null,
  suspendedAt: null,
  emailStatus: "sent",
  refundStatus: "not_owed",
  customer: {
    id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    name: "Ada Lovelace",
    email: "ada@example.com",
  },
  payment: {
    status: "succeeded",
    amount: 9900,
    paidAt: "2026-10-16T10:00:00Z",
  },
} as const satisfies AdminCourse["enrollments"][number];

const course: AdminCourse = {
  ...draftedAdminCourse,
  enrollments: [enrollment],
};

const priceIds = [
  "6a1f8e2c-3b4d-4e5f-8a9b-0c1d2e3f4a51",
  "6a1f8e2c-3b4d-4e5f-8a9b-0c1d2e3f4a52",
  "6a1f8e2c-3b4d-4e5f-8a9b-0c1d2e3f4a53",
];

/** A price as the PUT sends it: no id, in the store's currency. */
function pricedAt(effectiveAt: string, amount: number) {
  return { amount, currency: "USD", effectiveAt } as const;
}

describe("toEditFormPrefill", () => {
  it("takes the edited fields from the course, with the times in its zone", () => {
    const { values } = toEditFormPrefill(course);

    expect(values).toEqual({
      name: course.name,
      summary: course.summary,
      description: course.description,
      contentUrl: course.contentUrl,
      schedule: {
        timeZone: "America/New_York",
        startDate: "2026-10-01",
        startTimeOfDay: "14:00",
        endDate: "2026-10-01",
        endTimeOfDay: "16:00",
      },
      // The course's only price is already in effect, so it is no row.
      prices: [],
      status: "drafted",
      image: null,
    });
  });

  it("fills the times in UTC when the stored zone is not a real zone", () => {
    const { values } = toEditFormPrefill({
      ...course,
      schedule: { ...course.schedule, timeZone: "Not/AZone" },
    });

    expect(values.schedule).toEqual({
      timeZone: "Not/AZone",
      startDate: "2026-10-01",
      startTimeOfDay: "18:00",
      endDate: "2026-10-01",
      endTimeOfDay: "20:00",
    });
  });

  it("carries the stored image's version, or null when there is none", () => {
    const withImage: AdminCourse = {
      ...course,
      image: { updatedAt: "2026-10-01T10:00:00Z", version: "3" },
    };

    expect(toEditFormPrefill(withImage).storedImageVersion).toBe("3");
    expect(toEditFormPrefill(course).storedImageVersion).toBeNull();
  });

  it("holds the status as loaded, as a form value", () => {
    expect(toEditFormPrefill(course).values.status).toBe("drafted");
  });

  it("says yes for a course with an enrollment and no for one without", () => {
    expect(toEditFormPrefill(course).hasEnrollments).toBe(true);
    expect(toEditFormPrefill(draftedAdminCourse).hasEnrollments).toBe(false);
  });

  it("keeps the start and end as the loaded UTC strings", () => {
    expect(toEditFormPrefill(course).loadedSchedule).toEqual({
      startTime: course.schedule.startTime,
      endTime: course.schedule.endTime,
    });
  });

  it("keeps the prices in effect without their ids", () => {
    const afterTheOnlyPrice = Date.parse("2026-11-01T00:00:00Z");

    expect(toEditFormPrefill(course, afterTheOnlyPrice).loadedPrices).toEqual({
      inEffect: [
        { amount: 9900, currency: "USD", effectiveAt: "2026-10-15T18:31:00Z" },
      ],
      future: [],
    });
  });

  it("splits the prices at the render moment and makes the future ones rows", () => {
    const renderMs = Date.parse("2026-11-01T00:00:00Z");
    const withFuturePrices: AdminCourse = {
      ...course,
      prices: [
        { ...pricedAt("2026-10-15T18:31:00Z", 9900), id: priceIds[0] },
        { ...pricedAt("2026-11-01T00:00:00Z", 7950), id: priceIds[1] },
        { ...pricedAt("2027-01-01T14:00:30Z", 12900), id: priceIds[2] },
      ],
    };

    const prefill = toEditFormPrefill(withFuturePrices, renderMs);

    expect(prefill.loadedPrices).toEqual({
      inEffect: [
        pricedAt("2026-10-15T18:31:00Z", 9900),
        pricedAt("2026-11-01T00:00:00Z", 7950),
      ],
      future: [pricedAt("2027-01-01T14:00:30Z", 12900)],
    });
    expect(prefill.values.prices).toEqual([
      {
        amountDollars: "129.00",
        effectiveDate: "2027-01-01",
        effectiveTimeOfDay: "09:00",
      },
    ]);
  });

  describe("scheduleProgress", () => {
    const renderMs = Date.parse("2026-11-03T12:00:00Z");
    const progressFor = (startTime: string, endTime: string) =>
      toEditFormPrefill(
        {
          ...course,
          schedule: { ...course.schedule, startTime, endTime },
        },
        renderMs,
      ).scheduleProgress;

    it("is notStarted when the start is ahead", () => {
      expect(progressFor("2026-11-04T12:00:00Z", "2026-11-04T14:00:00Z")).toBe(
        "notStarted",
      );
    });

    it("is started when the start has passed and the end is ahead", () => {
      expect(progressFor("2026-11-03T11:00:00Z", "2026-11-03T14:00:00Z")).toBe(
        "running",
      );
    });

    it("is ended when the end has passed", () => {
      expect(progressFor("2026-11-03T09:00:00Z", "2026-11-03T10:00:00Z")).toBe(
        "ended",
      );
    });

    it("counts a start equal to the render time as started", () => {
      expect(progressFor("2026-11-03T12:00:00Z", "2026-11-03T14:00:00Z")).toBe(
        "running",
      );
    });

    it("counts an end equal to the render time as ended", () => {
      expect(progressFor("2026-11-03T10:00:00Z", "2026-11-03T12:00:00Z")).toBe(
        "ended",
      );
    });
  });

  it("never carries the enrollments", () => {
    const start = toEditFormPrefill(course);

    expect(JSON.stringify(start)).not.toContain("ada@example.com");
    expect(start).not.toHaveProperty("enrollments");
  });
});
