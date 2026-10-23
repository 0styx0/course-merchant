import { Inject, Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";

import type { DbScope } from "types.js";
import {
  EmailOutboxRepository,
  type QueuedEmail,
} from "@/email/email-outbox.repository.js";

// Anyone can start a checkout for any address, so cap how many emails one
// inbox receives. Over the cap the response is unchanged; nothing is queued.
const CHECKOUT_EMAIL_LIMIT = 5;
const CHECKOUT_EMAIL_WINDOW = { hours: 24 };

@Injectable()
export class CheckoutEmailQueue {
  constructor(
    @Inject(EmailOutboxRepository)
    private readonly emailOutbox: EmailOutboxRepository,
  ) {}

  /** Queues the email unless its recipient is already at the cap. */
  async queue(
    tx: DbScope,
    now: Temporal.Instant,
    email: QueuedEmail,
  ): Promise<void> {
    const recentlyQueued = await this.emailOutbox.countQueuedSince(
      tx,
      email.recipient,
      now.subtract(CHECKOUT_EMAIL_WINDOW),
    );

    const isOverLimit = recentlyQueued >= CHECKOUT_EMAIL_LIMIT;

    if (isOverLimit) {
      return;
    }

    await this.emailOutbox.enqueue(tx, email);
  }
}
