import { describe, expect, it } from "vitest";

import { EmailViewsRepository } from "@/email/outbox/email-views.repository.js";
import { db } from "@/prisma/db.js";
import { createPricedCourse } from "@/test/course-fixtures.js";

describe("EmailViewsRepository (integration)", () => {
  const repository = new EmailViewsRepository();

  it("finds the course details a template shows", async () => {
    const { course } = await createPricedCourse({ title: "Intro to Rust" });

    const found = await repository.findCourse(db, course.id);

    expect(found).toMatchObject({
      title: "Intro to Rust",
      contentUrl: course.contentUrl,
      timeZone: course.timeZone,
    });
  });

  it("returns null for ids that don't exist", async () => {
    const missing = crypto.randomUUID();

    expect(await repository.findCourse(db, missing)).toBeNull();
  });
});
