import { Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";
import { and } from "@prisma/orm-postgres/orm-client";

import type { Models } from "@/prisma/contract.js";
import type { DbScope } from "types.js";

export type EmailKind = Models.public_EmailOutbox["kind"];

// Payloads hold ids, not rendered content, so an email always shows the
// course's current details (such as an updated content link) when it's sent.
type EmailPayloads = {
  access_granted: { courseId: string; customerId: string };
  // refundIssued: the buyer paid twice and the second payment was refunded
  already_owned: { courseId: string; customerId: string; refundIssued: boolean };
  access_suspended: { courseId: string; customerId: string };
  dispute_alert: { paymentId: string };
};

export type QueuedEmail = {
  [Kind in EmailKind]: {
    kind: Kind;
    recipient: string;
    payload: EmailPayloads[Kind];
  };
}[EmailKind];

@Injectable()
export class EmailOutboxRepository {
  /**
   * Queues an email in the caller's scope. Pass the transaction that makes the
   * change the email describes, so the email exists only if that change
   * commits.
   */
  async enqueue(scope: DbScope, email: QueuedEmail): Promise<void> {
    await scope.orm.public.EmailOutbox.create({
      kind: email.kind,
      recipient: email.recipient,
      payload: email.payload,
      attempts: 0,
    });
  }

  /** How many emails have been queued for `recipient` since `since`. */
  async countQueuedSince(
    scope: DbScope,
    recipient: string,
    since: Temporal.Instant,
  ): Promise<number> {
    const { queued } = await scope.orm.public.EmailOutbox
      .where((email) =>
        and(email.recipient.eq(recipient), email.createdAt.gte(since)),
      )
      .aggregate((aggregate) => ({ queued: aggregate.count() }));

    return queued;
  }
}
