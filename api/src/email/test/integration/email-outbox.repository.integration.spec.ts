import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import { EmailOutboxRepository } from "@/email/email-outbox.repository.js";
import { MAX_SEND_ATTEMPTS } from "@/email/retry-policy.js";
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

  describe("findDue", () => {
    it("returns pending emails that are due, oldest first", async () => {
      const now = Temporal.Now.instant();

      await db.orm.public.EmailOutbox.createAll([
        {
          ...accessEmail("newer@example.com"),
          attempts: 0,
          createdAt: now.subtract({ minutes: 1 }),
        },
        {
          ...accessEmail("older@example.com"),
          attempts: 0,
          createdAt: now.subtract({ minutes: 2 }),
        },
        {
          ...accessEmail("later@example.com"),
          attempts: 0,
          nextAttemptAt: now.add({ minutes: 5 }),
        },
        { ...accessEmail("sent@example.com"), attempts: 0, status: "sent" },
        { ...accessEmail("failed@example.com"), attempts: 0, status: "failed" },
      ]);

      const due = await repository.findDue(db, Temporal.Now.instant(), 10);

      expect(due.map((email) => email.recipient)).toEqual([
        "older@example.com",
        "newer@example.com",
      ]);
    });

    it("returns at most the limit", async () => {
      await db.orm.public.EmailOutbox.createAll([
        { ...accessEmail("ada@example.com"), attempts: 0 },
        { ...accessEmail("grace@example.com"), attempts: 0 },
      ]);

      expect(
        await repository.findDue(db, Temporal.Now.instant(), 1),
      ).toHaveLength(1);
    });
  });

  describe("markSent", () => {
    it("marks a pending email sent", async () => {
      const email = await queuedEmail("ada@example.com");
      const sentAt = Temporal.Now.instant();

      await repository.markSent(db, email.id, sentAt);

      expect(await storedEmail(email.id)).toMatchObject({
        status: "sent",
        sentAt,
      });
    });
  });

  describe("markFailedAttempt", () => {
    it("counts the attempt and schedules a retry", async () => {
      const email = await queuedEmail("ada@example.com");
      const now = Temporal.Now.instant();

      await repository.markFailedAttempt(db, email, "provider down", now);

      const stored = await storedEmail(email.id);

      expect(stored).toMatchObject({
        status: "pending",
        attempts: 1,
        lastError: "provider down",
      });
      expect(stored.nextAttemptAt.epochMilliseconds).toBe(
        now.add({ minutes: 1 }).epochMilliseconds,
      );
    });

    it("marks the email failed on the last attempt", async () => {
      const email = await queuedEmail("ada@example.com", {
        attempts: MAX_SEND_ATTEMPTS - 1,
      });

      await repository.markFailedAttempt(
        db,
        email,
        "provider down",
        Temporal.Now.instant(),
      );

      expect(await storedEmail(email.id)).toMatchObject({
        status: "failed",
        attempts: MAX_SEND_ATTEMPTS,
        lastError: "provider down",
      });
    });
  });

  const queuedEmail = (
    recipient: string,
    overrides: { attempts?: number } = {},
  ) =>
    db.orm.public.EmailOutbox.create({
      ...accessEmail(recipient),
      attempts: 0,
      ...overrides,
    });

  const storedEmail = async (emailId: string) =>
    (await db.orm.public.EmailOutbox.where((email) =>
      email.id.eq(emailId),
    ).first())!;
});
