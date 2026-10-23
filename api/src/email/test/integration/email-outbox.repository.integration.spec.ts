import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import { EmailOutboxRepository } from "@/email/email-outbox.repository.js";
import { MAX_SEND_ATTEMPTS } from "@/email/retry-policy.js";
import { DatabaseClock } from "@/prisma/database-clock.js";
import { db } from "@/prisma/db.js";
import {
  createCustomer,
  createEnrollment,
  createPricedCourse,
} from "@/test/course-fixtures.js";

describe("EmailOutboxRepository (integration)", () => {
  const repository = new EmailOutboxRepository();
  // Postgres stamps nextAttemptAt, so "is it due yet?" must ask its clock.
  const clock = new DatabaseClock();

  const accessEmail = (recipient: string) => ({
    kind: "access_granted" as const,
    recipient,
    payload: {
      courseId: crypto.randomUUID(),
      customerId: crypto.randomUUID(),
    },
  });

  const enrolledAccessEmail = async (recipient: string) => {
    const { course } = await createPricedCourse();
    const customer = await createCustomer({ name: "Ada", email: recipient });
    const enrollment = await createEnrollment({
      courseId: course.id,
      customerId: customer.id,
    });

    return {
      kind: "access_granted" as const,
      recipient,
      payload: { courseId: course.id, customerId: customer.id },
      enrollmentId: enrollment.id,
    };
  };

  describe("enqueue", () => {
    it("stores a pending email ready to send now", async () => {
      const before = await clock.now(db);
      const email = await enrolledAccessEmail("ada@example.com");

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

    it("links an enrollment's email to its enrollment", async () => {
      const email = await enrolledAccessEmail("ada@example.com");

      await repository.enqueue(db, email);

      const [link] = await db.orm.public.EnrollmentEmail.all();
      const [stored] = await db.orm.public.EmailOutbox.all();

      expect(link).toEqual({
        emailId: stored.id,
        enrollmentId: email.enrollmentId,
      });
    });

    it("links the owner's dispute alert to no enrollment", async () => {
      await repository.enqueue(db, {
        kind: "dispute_alert",
        recipient: "owner@example.com",
        payload: { paymentId: crypto.randomUUID() },
      });

      expect(await db.orm.public.EmailOutbox.all()).toHaveLength(1);
      expect(await db.orm.public.EnrollmentEmail.all()).toEqual([]);
    });

    it("discards the email and its link when the caller's transaction rolls back", async () => {
      const email = await enrolledAccessEmail("ada@example.com");

      await expect(
        db.transaction(async (tx) => {
          await repository.enqueue(tx, email);

          throw new Error("enrollment failed");
        }),
      ).rejects.toThrow("enrollment failed");

      expect(await db.orm.public.EmailOutbox.all()).toEqual([]);
      expect(await db.orm.public.EnrollmentEmail.all()).toEqual([]);
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

      const due = await repository.findDue(db, await clock.now(db), 10);

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

      expect(await repository.findDue(db, await clock.now(db), 1)).toHaveLength(
        1,
      );
    });
  });

  describe("claim", () => {
    it("lets only the first of two workers claim an email", async () => {
      const email = await queuedEmail("ada@example.com");
      const now = Temporal.Now.instant();

      expect(await repository.claim(db, email, now)).toBe(true);
      expect(await repository.claim(db, email, now)).toBe(false);
    });

    it("holds the email for 10 minutes, so it is no longer due", async () => {
      const email = await queuedEmail("ada@example.com");
      const now = Temporal.Now.instant();

      await repository.claim(db, email, now);

      expect(
        (await storedEmail(email.id)).nextAttemptAt.epochMilliseconds,
      ).toBe(now.add({ minutes: 10 }).epochMilliseconds);
      expect(await repository.findDue(db, now, 10)).toEqual([]);
    });

    it("doesn't claim an email that was already sent", async () => {
      const email = await queuedEmail("ada@example.com");
      await repository.markSent(db, email.id, Temporal.Now.instant());

      expect(await repository.claim(db, email, Temporal.Now.instant())).toBe(
        false,
      );
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
