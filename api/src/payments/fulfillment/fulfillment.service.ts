import { Inject, Injectable, Logger } from "@nestjs/common";

import type { DbScope } from "types.js";
import {
  EmailOutboxRepository,
  type QueuedEmail,
} from "@/email/outbox/email-outbox.repository.js";
import {
  EnrollmentAccess,
  enrollmentAccess,
} from "@/enrollments/enrollment-access.js";
import {
  EnrollmentsRepository,
  type EnrollmentRecord,
} from "@/enrollments/enrollments.repository.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import { isOurPaymentId } from "../payment-id.js";
import {
  PaymentsRepository,
  type FulfillmentPayment,
} from "../payments.repository.js";
import type {
  CheckoutCompletion,
  CompletedCheckout,
} from "../stripe/checkout-events.js";
import { PaymentRefunds } from "../payment-refunds.js";
import type { RefundCause } from "../stripe/stripe.service.js";

type ProviderPayment = NonNullable<CheckoutCompletion["providerPayment"]>;

enum FulfillmentNextStep {
  // everything was recorded; nothing left to do
  DONE = "DONE",
  // the buyer can't use this payment, so it is refunded once the database changes are saved
  REFUND_PAYMENT = "REFUND_PAYMENT",
}

type FulfillmentDecision =
  | { nextStep: FulfillmentNextStep.DONE }
  | {
      nextStep: FulfillmentNextStep.REFUND_PAYMENT;
      paymentId: string;
      providerPaymentId: string;
      cause: RefundCause;
    };

const DONE: FulfillmentDecision = { nextStep: FulfillmentNextStep.DONE };

/** Everything the outcome handlers need about one paid payment. */
type FulfillmentContext = {
  tx: DbScope;
  payment: FulfillmentPayment;
  providerPayment: ProviderPayment;
};

/**
 * Grants access for a paid checkout and queues the buyer's email, in one
 * transaction, so a failure part-way leaves the event unrecorded and the
 * provider's retry runs it again. Anything that calls the provider happens
 * after that transaction commits.
 */
@Injectable()
export class FulfillmentService {
  private readonly logger = new Logger(FulfillmentService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(PaymentsRepository)
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(EnrollmentsRepository)
    private readonly enrollmentsRepository: EnrollmentsRepository,
    @Inject(EmailOutboxRepository)
    private readonly emailOutbox: EmailOutboxRepository,
    @Inject(PaymentRefunds)
    private readonly paymentRefunds: PaymentRefunds,
  ) {}

  async fulfillCheckout(checkout: CompletedCheckout): Promise<void> {
    const decision = await this.recordFulfillment(checkout);

    await this.carryOut(decision);
  }

  /**
   * Fulfills a checkout the sweeper retrieved. There is no event to record:
   * the guarded payment update alone stops this and the webhook from both
   * fulfilling it.
   */
  async fulfillRetrievedCheckout(
    completion: CheckoutCompletion,
  ): Promise<void> {
    const decision = await this.prisma.db.transaction((tx) =>
      this.fulfillCompletion(tx, completion),
    );

    await this.carryOut(decision);
  }

  private recordFulfillment(
    checkout: CompletedCheckout,
  ): Promise<FulfillmentDecision> {
    return this.prisma.db.transaction(async (tx) => {
      const isNewEvent = await this.paymentsRepository.recordProcessedEvent(
        tx,
        checkout.event,
      );

      return isNewEvent ? this.fulfillCompletion(tx, checkout) : DONE;
    });
  }

  private async carryOut(decision: FulfillmentDecision): Promise<void> {
    switch (decision.nextStep) {
      case FulfillmentNextStep.DONE:
        return;
      case FulfillmentNextStep.REFUND_PAYMENT:
        return this.refundAfterCommit(decision);
    }
  }

  /**
   * A failed refund must not fail the webhook: the event is already recorded,
   * so a redelivery would do nothing, and the sweeper retries the refund.
   */
  private async refundAfterCommit(decision: {
    paymentId: string;
    providerPaymentId: string;
    cause: RefundCause;
  }): Promise<void> {
    try {
      await this.paymentRefunds.refund({
        paymentId: decision.paymentId,
        providerPaymentId: decision.providerPaymentId,
        cause: decision.cause,
      });
    } catch (error) {
      this.logger.error(
        `Refund of payment ${decision.paymentId} (${decision.cause}) failed; the sweeper will retry it.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async fulfillCompletion(
    tx: DbScope,
    checkout: CheckoutCompletion,
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

    return this.grantPurchase({ tx, payment, providerPayment });
  }

  private async findOurPayment(
    tx: DbScope,
    paymentId: string | null,
  ): Promise<FulfillmentPayment | null> {
    if (!isOurPaymentId(paymentId)) {
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

    return this.respondToAccess(enrollment, context);
  }

  private respondToAccess(
    enrollment: EnrollmentRecord | null,
    context: FulfillmentContext,
  ): Promise<FulfillmentDecision> {
    if (!enrollment) {
      return this.grantPaidAccess(context);
    }

    switch (enrollmentAccess(enrollment)) {
      case EnrollmentAccess.ACTIVE:
        return this.handleDoublePurchase(context, enrollment.id);
      case EnrollmentAccess.SUSPENDED:
        return this.explainSuspension(context, enrollment.id);
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

    const enrollmentId = await this.enrollmentsRepository.grantAccess(
      context.tx,
      {
        courseId: payment.courseId,
        customerId: payment.customer.id,
        paymentId: payment.id,
        now: context.providerPayment.paidAt,
      },
    );

    // false only if another payment for this course was fulfilled
    // concurrently; the sweeper refunds this one
    if (enrollmentId) {
      await this.queueEmail(context, {
        kind: "access_granted",
        recipient: payment.customer.email,
        payload: emailIds(context),
        enrollmentId,
      });
    }

    return DONE;
  }

  /** Two checkouts started, then both paid: the later one is refunded. */
  private async handleDoublePurchase(
    context: FulfillmentContext,
    enrollmentId: string,
  ): Promise<FulfillmentDecision> {
    await this.queueEmail(context, {
      kind: "already_owned",
      recipient: context.payment.customer.email,
      payload: { ...emailIds(context), refundIssued: true },
      enrollmentId,
    });

    return refundDecision(context, "double_purchase");
  }

  /** The buyer can't use what they paid for, so the payment is refunded. */
  private async explainSuspension(
    context: FulfillmentContext,
    enrollmentId: string,
  ): Promise<FulfillmentDecision> {
    await this.queueEmail(context, {
      kind: "access_suspended",
      recipient: context.payment.customer.email,
      payload: { ...emailIds(context), refundIssued: true },
      enrollmentId,
    });

    return refundDecision(context, "suspended_access");
  }

  // no per-address cap, unlike checkout: only a real payment queues these
  private queueEmail(
    context: FulfillmentContext,
    email: QueuedEmail,
  ): Promise<void> {
    return this.emailOutbox.enqueue(context.tx, email);
  }
}

function refundDecision(
  context: FulfillmentContext,
  cause: RefundCause,
): FulfillmentDecision {
  return {
    nextStep: FulfillmentNextStep.REFUND_PAYMENT,
    paymentId: context.payment.id,
    providerPaymentId: context.providerPayment.id,
    cause,
  };
}

function emailIds(context: FulfillmentContext) {
  return {
    courseId: context.payment.courseId,
    customerId: context.payment.customer.id,
  };
}
