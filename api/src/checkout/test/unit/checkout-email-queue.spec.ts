import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutEmailQueue } from "@/checkout/checkout-email-queue.js";
import {
  EmailOutboxRepository,
  type QueuedEmail,
} from "@/email/email-outbox.repository.js";
import {
  asDependency,
  fakePrisma,
  type MockMethods,
} from "@/test/test-helpers.js";

const now = Temporal.Instant.from("2026-10-23T12:00:00Z");

const email: QueuedEmail = {
  kind: "access_granted",
  recipient: "ada@example.com",
  payload: {
    courseId: "8b0e1f5c-0000-4000-8000-000000000001",
    customerId: "8b0e1f5c-0000-4000-8000-000000000002",
  },
  enrollmentId: "8b0e1f5c-0000-4000-8000-000000000005",
};

describe("CheckoutEmailQueue", () => {
  let queue: CheckoutEmailQueue;
  let emailOutbox: MockMethods<
    EmailOutboxRepository,
    "enqueue" | "countQueuedSince"
  >;
  let tx: ReturnType<typeof fakePrisma>["tx"];

  beforeEach(() => {
    emailOutbox = {
      enqueue: vi
        .fn<EmailOutboxRepository["enqueue"]>()
        .mockResolvedValue(undefined),
      countQueuedSince: vi
        .fn<EmailOutboxRepository["countQueuedSince"]>()
        .mockResolvedValue(0),
    };
    tx = fakePrisma().tx;
    queue = new CheckoutEmailQueue(
      asDependency<EmailOutboxRepository>(emailOutbox),
    );
  });

  it("counts the recipient's own emails over the last 24 hours", async () => {
    await queue.queue(tx, now, email);

    expect(emailOutbox.countQueuedSince).toHaveBeenCalledExactlyOnceWith(
      tx,
      "ada@example.com",
      Temporal.Instant.from("2026-10-22T12:00:00Z"),
    );
  });

  it.each([0, 1, 4])("queues the email when %i were queued", async (count) => {
    emailOutbox.countQueuedSince.mockResolvedValue(count);

    await queue.queue(tx, now, email);

    expect(emailOutbox.enqueue).toHaveBeenCalledExactlyOnceWith(tx, email);
  });

  it.each([5, 6])("queues nothing when %i were queued", async (count) => {
    emailOutbox.countQueuedSince.mockResolvedValue(count);

    await queue.queue(tx, now, email);

    expect(emailOutbox.enqueue).not.toHaveBeenCalled();
  });
});
