import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import { DatabaseClock } from "@/prisma/database-clock.js";
import { db } from "@/prisma/db.js";

describe("DatabaseClock (integration)", () => {
  const clock = new DatabaseClock();

  it("reads a time no earlier than a row Postgres stamped before it", async () => {
    const queued = await db.orm.public.EmailOutbox.create({
      kind: "dispute_alert",
      recipient: "owner@example.com",
      payload: { paymentId: crypto.randomUUID() },
      attempts: 0,
    });

    const now = await clock.now(db);

    expect(
      Temporal.Instant.compare(now, queued.nextAttemptAt),
    ).toBeGreaterThanOrEqual(0);
  });

  it("keeps the database's microseconds", async () => {
    const readings = await Promise.all(
      Array.from({ length: 5 }, () => clock.now(db)),
    );

    expect(
      readings.some((now) => now.epochNanoseconds % 1_000_000n !== 0n),
    ).toBe(true);
  });

  it("reads the transaction's time inside a transaction", async () => {
    await db.transaction(async (tx) => {
      const first = await clock.now(tx);
      const second = await clock.now(tx);

      expect(first.equals(second)).toBe(true);
    });
  });
});
