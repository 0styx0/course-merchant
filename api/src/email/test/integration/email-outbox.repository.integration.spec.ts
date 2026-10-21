import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import { EmailOutboxRepository } from "@/email/email-outbox.repository.js";
import { db } from "@/prisma/db.js";

describe("EmailOutboxRepository (integration)", () => {
  const repository = new EmailOutboxRepository();

  const accessEmail = (recipient: string) => ({
    kind: "access_granted" as const,
    recipient,
    payload: {
      courseId: crypto.randomUUID(),
      customerId: crypto.randomUUID(),
    },
  });

  describe("enqueue", () => {
    it("stores a pending email ready to send now", async () => {
      const before = Temporal.Now.instant();
      const email = accessEmail("ada@example.com");

      await repository.enqueue(db, email);

      const [stored] = await db.orm.public.EmailOutbox.all();

      expect(stored).toMatchObject({
        kind: "access_granted",
        recipient: "ada@example.com",
        payload: email.payload,
        status: "pending",
        attempts: 0,
        lastError: null,
        sentAt: null,
      });
      expect(
        Temporal.Instant.compare(stored.nextAttemptAt, before),
      ).toBeGreaterThanOrEqual(0);
    });

    it("discards the email when the caller's transaction rolls back", async () => {
      await expect(
        db.transaction(async (tx) => {
          await repository.enqueue(tx, accessEmail("ada@example.com"));

          throw new Error("enrollment failed");
        }),
      ).rejects.toThrow("enrollment failed");

      expect(await db.orm.public.EmailOutbox.all()).toEqual([]);
    });
  });

  describe("countQueuedSince", () => {
    it("counts only the recipient's emails queued since the given time", async () => {
      const now = Temporal.Now.instant();

      await db.orm.public.EmailOutbox.createAll([
        { ...accessEmail("ada@example.com"), attempts: 0 },
        { ...accessEmail("ada@example.com"), attempts: 0 },
        { ...accessEmail("grace@example.com"), attempts: 0 },
        {
          ...accessEmail("ada@example.com"),
          attempts: 0,
          createdAt: now.subtract({ hours: 25 }),
        },
      ]);

      expect(
        await repository.countQueuedSince(
          db,
          "ada@example.com",
          now.subtract({ hours: 24 }),
        ),
      ).toBe(2);
    });

    it("returns 0 when nothing has been queued", async () => {
      expect(
        await repository.countQueuedSince(
          db,
          "ada@example.com",
          Temporal.Now.instant().subtract({ hours: 24 }),
        ),
      ).toBe(0);
    });
  });
});
