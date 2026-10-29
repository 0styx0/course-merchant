import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "vitest";

import { AdminLoginAttemptsRepository } from "@/auth/login/admin-login-attempts.repository.js";
import { AdminSessionCleanup } from "@/auth/sessions/admin-session-cleanup.js";
import { AdminSessionsRepository } from "@/auth/sessions/admin-sessions.repository.js";
import { AdminsRepository } from "@/auth/admins.repository.js";
import { db } from "@/prisma/db.js";
import { PrismaService } from "@/prisma/prisma.service.js";

describe("AdminSessionCleanup (integration)", () => {
  const cleanup = new AdminSessionCleanup(
    new PrismaService(),
    new AdminSessionsRepository(),
    new AdminLoginAttemptsRepository(),
  );
  let adminId: string;

  beforeEach(async () => {
    ({ adminId } = await new AdminsRepository().setPassword(
      db,
      "owner@example.com",
      "hash",
    ));
  });

  function ago(duration: Temporal.DurationLike): Temporal.Instant {
    return Temporal.Now.instant().subtract(duration);
  }

  function insertSession(
    tokenHash: string,
    times: { createdAt: Temporal.Instant; updatedAt: Temporal.Instant },
  ) {
    return db.orm.public.AdminSession.create({ adminId, tokenHash, ...times });
  }

  async function remainingTokenHashes(): Promise<string[]> {
    const sessions = await db.orm.public.AdminSession.all();

    return sessions.map((session) => session.tokenHash).sort();
  }

  it("deletes sessions past 7 days or idle over 24 hours, and keeps the rest", async () => {
    await insertSession("fresh", {
      createdAt: ago({ minutes: 1 }),
      updatedAt: ago({ minutes: 1 }),
    });
    await insertSession("nearly-old", {
      createdAt: ago({ hours: 7 * 24 - 1 }),
      updatedAt: ago({ hours: 1 }),
    });
    await insertSession("nearly-idle", {
      createdAt: ago({ hours: 30 }),
      updatedAt: ago({ hours: 23 }),
    });
    await insertSession("too-old", {
      createdAt: ago({ hours: 7 * 24 + 1 }),
      updatedAt: ago({ hours: 1 }),
    });
    await insertSession("idle", {
      createdAt: ago({ hours: 30 }),
      updatedAt: ago({ hours: 25 }),
    });

    await cleanup.cleanup();

    expect(await remainingTokenHashes()).toEqual([
      "fresh",
      "nearly-idle",
      "nearly-old",
    ]);
  });

  it("deletes login attempts older than 15 minutes, and keeps recent ones", async () => {
    await db.orm.public.AdminLoginAttempt.createAll([
      { email: "old@example.com", createdAt: ago({ minutes: 16 }) },
      { email: "recent@example.com", createdAt: ago({ minutes: 14 }) },
    ]);

    await cleanup.cleanup();

    const attempts = await db.orm.public.AdminLoginAttempt.all();
    expect(attempts.map((attempt) => attempt.email)).toEqual([
      "recent@example.com",
    ]);
  });

  it("is harmless to run again", async () => {
    await insertSession("idle", {
      createdAt: ago({ hours: 30 }),
      updatedAt: ago({ hours: 25 }),
    });
    await insertSession("fresh", {
      createdAt: ago({ minutes: 1 }),
      updatedAt: ago({ minutes: 1 }),
    });

    await cleanup.cleanup();
    await cleanup.cleanup();

    expect(await remainingTokenHashes()).toEqual(["fresh"]);
  });
});
