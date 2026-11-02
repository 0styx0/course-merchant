import { describe, expect, it } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";
import type { AdminCourse } from "@/lib/types";

import { toEditFormPrefill } from "./edit-form-prefill";

const enrollment = {
  revokedAt: null,
  suspendedAt: null,
  emailStatus: "sent",
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

  it("keeps the status as a plain string", () => {
    expect(toEditFormPrefill(course).fieldsSentBackUnchanged.status).toBe(
      "drafted",
    );
  });

  it("keeps the start and end as the loaded UTC strings", () => {
    expect(toEditFormPrefill(course).loadedSchedule).toEqual({
      startTime: course.schedule.startTime,
      endTime: course.schedule.endTime,
    });
  });

  it("keeps the prices without their ids", () => {
    expect(toEditFormPrefill(course).fieldsSentBackUnchanged.prices).toEqual([
      { amount: 9900, currency: "USD", effectiveAt: "2026-10-15T18:31:00Z" },
    ]);
  });

  it("never carries the enrollments", () => {
    const start = toEditFormPrefill(course);

    expect(JSON.stringify(start)).not.toContain("ada@example.com");
    expect(start).not.toHaveProperty("enrollments");
    expect(start.fieldsSentBackUnchanged).not.toHaveProperty("enrollments");
  });
});
