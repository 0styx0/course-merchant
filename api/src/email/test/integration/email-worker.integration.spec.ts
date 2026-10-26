import { describe, expect, it, vi } from "vitest";

import { EmailComposer } from "@/email/email-composer.js";
import { EmailOutboxRepository } from "@/email/email-outbox.repository.js";
import { EmailSender } from "@/email/email-sender.js";
import { EmailViewsRepository } from "@/email/email-views.repository.js";
import { EmailWorker } from "@/email/email-worker.js";
import { DatabaseClock } from "@/prisma/database-clock.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import {
  createCustomer,
  createEnrollment,
  createPricedCourse,
} from "@/test/course-fixtures.js";

describe("EmailWorker (integration)", () => {
  const prisma = new PrismaService();
  const outbox = new EmailOutboxRepository();
  const composer = new EmailComposer(prisma, new EmailViewsRepository(), {
    smtpUrl: "smtp://localhost",
    requireTls: false,
    from: "Course Shop <hello@example.com>",
    shopName: "Course Shop",
  });

  function workerWith(sendMail = vi.fn().mockResolvedValue({})) {
    const sender = new EmailSender(
      { sendMail },
      {
        smtpUrl: "smtp://localhost",
        requireTls: false,
        from: "Course Shop <hello@example.com>",
        shopName: "Course Shop",
      },
    );

    return {
      worker: new EmailWorker(
        prisma,
        outbox,
        composer,
        sender,
        new DatabaseClock(),
      ),
      sendMail,
    };
  }

  async function queueAccessEmail(recipient: string, courseId?: string) {
    const { course } = await createPricedCourse();
    const customer = await createCustomer({ name: "Ada", email: recipient });

    const enrollment = await createEnrollment({
      courseId: course.id,
      customerId: customer.id,
    });

    await outbox.enqueue(prisma.db, {
      kind: "access_granted",
      recipient,
      payload: { courseId: courseId ?? course.id, customerId: customer.id },
      enrollmentId: enrollment.id,
    });
  }

  it("sends a due email and marks it sent", async () => {
    await queueAccessEmail("ada@example.com");
    const { worker, sendMail } = workerWith();

    await worker.sendDueEmails();

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ada@example.com" }),
    );
    const [stored] = await prisma.db.orm.public.EmailOutbox.all();
    expect(stored.status).toBe("sent");
    expect(stored.sentAt).not.toBeNull();
  });

  it("keeps a rejected email pending and schedules a retry", async () => {
    await queueAccessEmail("ada@example.com");
    const { worker } = workerWith(
      vi.fn().mockRejectedValue(new Error("connection refused")),
    );

    await worker.sendDueEmails();

    const [stored] = await prisma.db.orm.public.EmailOutbox.all();
    expect(stored).toMatchObject({ status: "pending", attempts: 1 });
    expect(stored.lastError).toContain("didn't accept");
  });

  it("counts a missing course as a failed attempt and still sends the rest", async () => {
    await queueAccessEmail("ghost@example.com", crypto.randomUUID());
    await queueAccessEmail("ada@example.com");
    const { worker, sendMail } = workerWith();

    await worker.sendDueEmails();

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ada@example.com" }),
    );
    const failed = await prisma.db.orm.public.EmailOutbox.where((email) =>
      email.recipient.eq("ghost@example.com"),
    ).first();
    expect(failed).toMatchObject({ status: "pending", attempts: 1 });
    expect(failed!.lastError).toContain("course no longer exists");
  });

  it("counts a malformed payload as a failed attempt and sends nothing", async () => {
    await prisma.db.orm.public.EmailOutbox.create({
      kind: "access_granted",
      recipient: "old@example.com",
      payload: { courseId: 42 },
      attempts: 0,
    });
    const { worker, sendMail } = workerWith();

    await worker.sendDueEmails();

    expect(sendMail).not.toHaveBeenCalled();
    const failed = await prisma.db.orm.public.EmailOutbox.where((email) =>
      email.recipient.eq("old@example.com"),
    ).first();
    expect(failed).toMatchObject({ status: "pending", attempts: 1 });
    expect(failed!.lastError).toContain("payload is invalid");
  });

  it("sends an email once when two workers run at the same time", async () => {
    await queueAccessEmail("ada@example.com");
    const sendMail = vi.fn().mockResolvedValue({});
    const first = workerWith(sendMail).worker;
    const second = workerWith(sendMail).worker;

    await Promise.all([first.sendDueEmails(), second.sendDueEmails()]);

    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
