import { describe, expect, it } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";
import type { AdminCourse } from "@/lib/types";

import { toEditCourseStart } from "./edit-course-start";

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

describe("toEditCourseStart", () => {
  it("takes the five edited fields from the course", () => {
    const { values } = toEditCourseStart(course);

    expect(values).toEqual({
      name: course.name,
      summary: course.summary,
      description: course.description,
      contentUrl: course.contentUrl,
      schedule: { timeZone: course.schedule.timeZone },
    });
  });

  it("keeps the status as a plain string", () => {
    expect(toEditCourseStart(course).keptParts.status).toBe("drafted");
  });

  it("keeps the start and end as the loaded UTC strings", () => {
    expect(toEditCourseStart(course).keptParts.schedule).toEqual({
      startTime: course.schedule.startTime,
      endTime: course.schedule.endTime,
    });
  });

  it("keeps the prices without their ids", () => {
    expect(toEditCourseStart(course).keptParts.prices).toEqual([
      { amount: 9900, currency: "USD", effectiveAt: "2026-10-15T18:31:00Z" },
    ]);
  });

  it("never carries the enrollments", () => {
    const start = toEditCourseStart(course);

    expect(JSON.stringify(start)).not.toContain("ada@example.com");
    expect(start).not.toHaveProperty("enrollments");
    expect(start.keptParts).not.toHaveProperty("enrollments");
  });
});
