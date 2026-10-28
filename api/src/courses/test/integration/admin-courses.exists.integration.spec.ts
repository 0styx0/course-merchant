import { describe, expect, it } from "vitest";

import { AdminCoursesRepository } from "@/courses/courses.repository/admin-courses.repository.js";
import { db } from "@/prisma/db.js";
import { createCourse, descriptionDoc } from "@/test/course-fixtures.js";
import { instant } from "@/test/test-helpers.js";

describe("AdminCoursesRepository.courseExists (integration)", () => {
  const repository = new AdminCoursesRepository();

  it("is true for a stored course and false for an unknown id", async () => {
    const course = await createCourse({
      title: "React Fundamentals",
      summary: "Learn React",
      description: descriptionDoc("Learn React"),
      startsAt: instant("2026-10-15T18:00:00Z"),
      endsAt: instant("2026-10-15T20:00:00Z"),
      timeZone: "UTC",
    });

    expect(await repository.courseExists(db, course.id)).toBe(true);
    expect(
      await repository.courseExists(db, "123e4567-e89b-12d3-a456-426614174000"),
    ).toBe(false);
  });
});
