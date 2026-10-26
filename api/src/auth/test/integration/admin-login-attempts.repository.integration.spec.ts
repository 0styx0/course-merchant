import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import { AdminLoginAttemptsRepository } from "@/auth/admin-login-attempts.repository.js";
import { db } from "@/prisma/db.js";

describe("AdminLoginAttemptsRepository (integration)", () => {
  const repository = new AdminLoginAttemptsRepository();
  const anHourAgo = () => Temporal.Now.instant().subtract({ hours: 1 });

  it("counts an email's attempts since a time, and no other email's", async () => {
    await repository.record(db, "owner@example.com");
    await repository.record(db, "owner@example.com");
    await repository.record(db, "other@example.com");

    expect(
      await repository.countSince(db, "owner@example.com", anHourAgo()),
    ).toBe(2);
    expect(
      await repository.countSince(db, "nobody@example.com", anHourAgo()),
    ).toBe(0);
  });

  it("leaves out attempts before the time", async () => {
    await db.orm.public.AdminLoginAttempt.create({
      email: "owner@example.com",
      createdAt: Temporal.Now.instant().subtract({ hours: 2 }),
    });
    await repository.record(db, "owner@example.com");

    expect(
      await repository.countSince(db, "owner@example.com", anHourAgo()),
    ).toBe(1);
  });

  it("deletes one email's attempts", async () => {
    await repository.record(db, "owner@example.com");
    await repository.record(db, "other@example.com");

    await repository.deleteAllForEmail(db, "owner@example.com");

    expect(await db.orm.public.AdminLoginAttempt.all()).toMatchObject([
      { email: "other@example.com" },
    ]);
  });
});
