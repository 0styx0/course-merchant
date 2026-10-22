import { Inject, Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";

import type { DbScope } from "types.js";
import {
  EmailOutboxRepository,
  type QueuedEmail,
} from "@/email/email-outbox.repository.js";
import {
  EnrollmentAccess,
  enrollmentAccess,
} from "@/enrollments/enrollment-access.js";
import { EnrollmentsRepository } from "@/enrollments/enrollments.repository.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import {
  PaymentsRepository,
  type FulfillmentPayment,
  type ProviderEvent,
} from "./payments.repository.js";

// any 8-4-4-4-12 hex id, which is what postgres accepts for a uuid column
const paymentIdSchema = z.guid();

/**
 * A checkout the provider reports as completed, in our terms, so the webhook
 * and (later) the sweeper can fulfill it the same way.
 */
export type CompletedCheckout = {
  event: ProviderEvent;
  // our Payment id, echoed back by the provider. Null when the checkout
  // wasn't started by us
  paymentId: string | null;
  providerCheckoutId: string;
  // null when the checkout completed without the payment being taken
  providerPayment: { id: string; paidAt: Temporal.Instant } | null;
};

export enum FulfillmentNextStep {
  // everything was recorded; nothing left to do
  DONE = "DONE",
  // the buyer already had access, so this payment is refunded after commit
  REFUND_DOUBLE_PURCHASE = "REFUND_DOUBLE_PURCHASE",
}

export type FulfillmentDecision =
  | { nextStep: FulfillmentNextStep.DONE }
  | { nextStep: FulfillmentNextStep.REFUND_DOUBLE_PURCHASE; paymentId: string };

const DONE: FulfillmentDecision = { nextStep: FulfillmentNextStep.DONE };

/** Everything the outcome handlers need about one paid payment. */
type FulfillmentContext = {
  tx: DbScope;
  payment: FulfillmentPayment;
  paidAt: Temporal.Instant;
};

/**
 * Grants access for a paid checkout and queues the buyer's email, in one
 * transaction, so a failure part-way leaves the event unrecorded and the
 * provider's retry runs it again.
 */
@Injectable()
export class FulfillmentService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(PaymentsRepository)
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(EnrollmentsRepository)
    private readonly enrollmentsRepository: EnrollmentsRepository,
    @Inject(EmailOutboxRepository)
    private readonly emailOutbox: EmailOutboxRepository,
  ) {}

  fulfillCheckout(checkout: CompletedCheckout): Promise<FulfillmentDecision> {
    return this.prisma.db.transaction(async (tx) => {
      const isNewEvent = await this.paymentsRepository.recordProcessedEvent(
        tx,
        checkout.event,
      );

      return isNewEvent ? this.fulfillNewEvent(tx, checkout) : DONE;
    });
  }

  private async fulfillNewEvent(
    tx: DbScope,
    checkout: CompletedCheckout,
  ): Promise<FulfillmentDecision> {
    const { providerPayment } = checkout;

    // unpaid: only delayed payment methods complete without paying, and
    // checkout allows cards only
    if (!providerPayment) {
      return DONE;
    }

    const payment = await this.findOurPayment(tx, checkout.paymentId);

    // not a checkout we started
    if (!payment) {
      return DONE;
    }

    const succeeded = await this.paymentsRepository.markPaymentSucceeded(tx, {
      id: payment.id,
      providerCheckoutId: checkout.providerCheckoutId,
      providerPaymentId: providerPayment.id,
      paidAt: providerPayment.paidAt,
    });

    // already fulfilled, or expired, by another caller
    if (!succeeded) {
      return DONE;
    }

    return this.grantPurchase({ tx, payment, paidAt: providerPayment.paidAt });
  }

  /**
   * A non-uuid id would make Postgres reject the query, and the provider would
   * retry the event for days, so it's treated as unknown instead.
   */
  private async findOurPayment(
    tx: DbScope,
    paymentId: string | null,
  ): Promise<FulfillmentPayment | null> {
    const isOurId = paymentIdSchema.safeParse(paymentId).success;

    if (!paymentId || !isOurId) {
      return null;
    }

    return this.paymentsRepository.findPaymentForFulfillment(tx, paymentId);
  }

  private async grantPurchase(
    context: FulfillmentContext,
  ): Promise<FulfillmentDecision> {
    const enrollment = await this.enrollmentsRepository.findEnrollment(
      context.tx,
      context.payment.courseId,
      context.payment.customer.id,
    );

    return this.respondToAccess(enrollmentAccess(enrollment), context);
  }

  private respondToAccess(
    access: EnrollmentAccess,
    context: FulfillmentContext,
  ): Promise<FulfillmentDecision> {
    switch (access) {
      case EnrollmentAccess.ACTIVE:
        return this.handleDoublePurchase(context);
      case EnrollmentAccess.SUSPENDED:
        return this.explainSuspension(context);
      // no access yet, or a refund removed it: this payment buys it
      case EnrollmentAccess.NONE:
      case EnrollmentAccess.REVOKED:
        return this.grantPaidAccess(context);
    }
  }

  private async grantPaidAccess(
    context: FulfillmentContext,
  ): Promise<FulfillmentDecision> {
    const { payment } = context;

    const accessGranted = await this.enrollmentsRepository.grantAccess(
      context.tx,
      {
        courseId: payment.courseId,
        customerId: payment.customer.id,
        paymentId: payment.id,
        now: context.paidAt,
      },
    );

    // false only if another payment for this course was fulfilled
    // concurrently; the sweeper refunds this one
    if (accessGranted) {
      await this.queueEmail(context, {
        kind: "access_granted",
        recipient: payment.customer.email,
        payload: emailIds(context),
      });
    }

    return DONE;
  }

  /** Two checkouts started, then both paid: the later one is refunded. */
  private async handleDoublePurchase(
    context: FulfillmentContext,
  ): Promise<FulfillmentDecision> {
    await this.queueEmail(context, {
      kind: "already_owned",
      recipient: context.payment.customer.email,
      payload: { ...emailIds(context), refundIssued: true },
    });

    return {
      nextStep: FulfillmentNextStep.REFUND_DOUBLE_PURCHASE,
      paymentId: context.payment.id,
    };
  }

  private async explainSuspension(
    context: FulfillmentContext,
  ): Promise<FulfillmentDecision> {
    await this.queueEmail(context, {
      kind: "access_suspended",
      recipient: context.payment.customer.email,
      payload: emailIds(context),
    });

    return DONE;
  }

  // no per-address cap, unlike checkout: only a real payment queues these
  private queueEmail(
    context: FulfillmentContext,
    email: QueuedEmail,
  ): Promise<void> {
    return this.emailOutbox.enqueue(context.tx, email);
  }
}

function emailIds(context: FulfillmentContext) {
  return {
    courseId: context.payment.courseId,
    customerId: context.payment.customer.id,
  };
}
