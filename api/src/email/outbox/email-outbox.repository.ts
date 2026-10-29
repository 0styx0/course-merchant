import { Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";
import { and } from "@prisma/orm-postgres/orm-client";

import type { Models } from "@/prisma/contract.js";
import type { DbScope } from "types.js";
import type { EmailPayloads } from "./email-payloads.js";
import { nextAttemptAfterFailure } from "../delivery/retry-policy.js";

// how long a worker holds an email it is sending; it must outlast the
// sender's timeouts, and is how long a crashed sender's email waits for a retry
const CLAIM_DURATION_MINUTES = 10;

export type EmailKind = Models.public_EmailOutbox["kind"];
// without the link to its enrollment, which only the admin view reads
export type OutboxEmail = Omit<Models.public_EmailOutbox, "enrollmentLink">;

// the owner's alert is about a payment, so it has no enrollment
type EnrollmentEmailKind = Exclude<EmailKind, "dispute_alert">;

export type QueuedEmail =
  | {
      [Kind in EnrollmentEmailKind]: {
        kind: Kind;
        recipient: string;
        payload: EmailPayloads[Kind];
        enrollmentId: string;
      };
    }[EnrollmentEmailKind]
  | {
      kind: "dispute_alert";
      recipient: string;
      payload: EmailPayloads["dispute_alert"];
    };

@Injectable()
export class EmailOutboxRepository {
  /**
   * Queues an email in the caller's scope. Pass the transaction that makes the
   * change the email describes, so the email exists only if that change
   * commits.
   */
  async enqueue(scope: DbScope, email: QueuedEmail): Promise<void> {
    const queued = await scope.orm.public.EmailOutbox.create({
      kind: email.kind,
      recipient: email.recipient,
      payload: email.payload,
      attempts: 0,
    });

    if (email.kind !== "dispute_alert") {
      await scope.orm.public.EnrollmentEmail.create({
        emailId: queued.id,
        enrollmentId: email.enrollmentId,
      });
    }
  }

  /** How many emails have been queued for `recipient` since `since`. */
  async countQueuedSince(
    scope: DbScope,
    recipient: string,
    since: Temporal.Instant,
  ): Promise<number> {
    const { queued } = await scope.orm.public.EmailOutbox.where((email) =>
      and(email.recipient.eq(recipient), email.createdAt.gte(since)),
    ).aggregate((aggregate) => ({ queued: aggregate.count() }));

    return queued;
  }

  /** Pending emails whose next attempt is due, oldest first. */
  async findDue(
    scope: DbScope,
    now: Temporal.Instant,
    limit: number,
  ): Promise<OutboxEmail[]> {
    return scope.orm.public.EmailOutbox.where((email) =>
      and(email.status.eq("pending"), email.nextAttemptAt.lte(now)),
    )
      .orderBy((email) => email.createdAt.asc())
      .limit(limit)
      .all();
  }

  /**
   * Holds a due email for this worker by moving its next attempt ahead. False
   * when another worker claimed it first, so this one must not send it.
   */
  async claim(
    scope: DbScope,
    email: OutboxEmail,
    now: Temporal.Instant,
  ): Promise<boolean> {
    const claimed = await scope.orm.public.EmailOutbox.where((candidate) =>
      and(
        candidate.id.eq(email.id),
        candidate.status.eq("pending"),
        candidate.nextAttemptAt.eq(email.nextAttemptAt),
      ),
    ).updateAndCount({
      nextAttemptAt: now.add({ minutes: CLAIM_DURATION_MINUTES }),
    });

    return claimed === 1;
  }

  async markSent(
    scope: DbScope,
    emailId: string,
    sentAt: Temporal.Instant,
  ): Promise<void> {
    await scope.orm.public.EmailOutbox.where((email) =>
      and(email.id.eq(emailId), email.status.eq("pending")),
    ).updateAndCount({ status: "sent", sentAt });
  }

  /**
   * Counts a failed send and schedules the retry, or marks the email failed
   * once its attempts are used up.
   */
  async markFailedAttempt(
    scope: DbScope,
    email: OutboxEmail,
    error: string,
    now: Temporal.Instant,
  ): Promise<void> {
    const attempts = email.attempts + 1;
    const nextAttemptAt = nextAttemptAfterFailure(attempts, now);

    await scope.orm.public.EmailOutbox.where((candidate) =>
      and(candidate.id.eq(email.id), candidate.status.eq("pending")),
    ).updateAndCount({
      attempts,
      lastError: error,
      ...(nextAttemptAt ? { nextAttemptAt } : { status: "failed" }),
    });
  }
}
