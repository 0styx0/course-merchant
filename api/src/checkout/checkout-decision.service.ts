import { Inject, Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";

import type { DbScope, StartCheckoutRequest } from "types.js";
import {
  EnrollmentAccess,
  enrollmentAccess,
} from "@/enrollments/enrollment-access.js";
import {
  EnrollmentsRepository,
  type EnrollmentRecord,
} from "@/enrollments/enrollments.repository.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import { CheckoutEmailQueue } from "./checkout-email-queue.js";
import {
  CheckoutRepository,
  type CheckoutCourse,
  type CheckoutCustomer,
} from "./checkout.repository.js";
import type { PaymentToComplete } from "./stripe-redirect.service.js";

/** One buyer's attempt to buy one course. */
export type CheckoutAttempt = {
  now: Temporal.Instant;
  course: CheckoutCourse;
  buyer: StartCheckoutRequest["customer"];
};

export enum CheckoutNextStep {
  // the outcome was emailed; nothing left to do
  CHECK_EMAIL = "CHECK_EMAIL",
  // a pending payment was recorded; send the buyer to Stripe
  PAY = "PAY",
}

export type CheckoutDecision =
  | { nextStep: CheckoutNextStep.CHECK_EMAIL }
  | { nextStep: CheckoutNextStep.PAY; paymentToComplete: PaymentToComplete };

const EMAILED: CheckoutDecision = { nextStep: CheckoutNextStep.CHECK_EMAIL };

/** Everything the outcome handlers need about one checkout attempt. */
type CheckoutContext = {
  tx: DbScope;
  now: Temporal.Instant;
  course: CheckoutCourse;
  customer: CheckoutCustomer;
};

/**
 * Decides what a buyer gets, and records it. Every write goes through the
 * `tx` the caller passes in, so the caller owns the transaction.
 */
@Injectable()
export class CheckoutDecisionService {
  constructor(
    @Inject(CheckoutRepository)
    private readonly checkoutRepository: CheckoutRepository,
    @Inject(PaymentsRepository)
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(EnrollmentsRepository)
    private readonly enrollmentsRepository: EnrollmentsRepository,
    @Inject(CheckoutEmailQueue)
    private readonly emailQueue: CheckoutEmailQueue,
  ) {}

  /** Identifies the buyer, then emails them the outcome or records a pending payment. */
  async decide(
    tx: DbScope,
    { now, course, buyer }: CheckoutAttempt,
  ): Promise<CheckoutDecision> {
    const customer = await this.checkoutRepository.findOrCreateCustomer(
      tx,
      buyer,
    );

    const enrollment = await this.enrollmentsRepository.findEnrollment(
      tx,
      course.id,
      customer.id,
    );

    return this.respondToAccess(enrollment, { tx, now, course, customer });
  }

  private respondToAccess(
    enrollment: EnrollmentRecord | null,
    context: CheckoutContext,
  ): Promise<CheckoutDecision> {
    if (!enrollment) {
      return this.sellCourse(context);
    }

    switch (enrollmentAccess(enrollment)) {
      case EnrollmentAccess.ACTIVE:
        return this.resendCourseLink(context, enrollment.id);
      case EnrollmentAccess.SUSPENDED:
        return this.explainSuspension(context, enrollment.id);
      // no access yet, or a refund removed it: the buyer can buy (again)
      case EnrollmentAccess.NONE:
      case EnrollmentAccess.REVOKED:
        return this.sellCourse(context);
    }
  }

  private resendCourseLink(
    context: CheckoutContext,
    enrollmentId: string,
  ): Promise<CheckoutDecision> {
    return this.emailAboutEnrollment(context, "already_owned", enrollmentId);
  }

  private explainSuspension(
    context: CheckoutContext,
    enrollmentId: string,
  ): Promise<CheckoutDecision> {
    return this.emailAboutEnrollment(context, "access_suspended", enrollmentId);
  }

  private async emailAboutEnrollment(
    context: CheckoutContext,
    kind: "already_owned" | "access_suspended",
    enrollmentId: string,
  ): Promise<CheckoutDecision> {
    await this.emailQueue.queue(context.tx, context.now, {
      kind,
      recipient: context.customer.email,
      payload: { ...emailIds(context), refundIssued: false },
      enrollmentId,
    });

    return EMAILED;
  }

  private sellCourse(context: CheckoutContext): Promise<CheckoutDecision> {
    const isFree = context.course.currentPrice.amount === 0;

    return isFree
      ? this.enrollInFreeCourse(context)
      : this.recordPendingPayment(context);
  }

  private async enrollInFreeCourse(
    context: CheckoutContext,
  ): Promise<CheckoutDecision> {
    const enrollmentId = await this.enrollmentsRepository.grantAccess(
      context.tx,
      {
        courseId: context.course.id,
        customerId: context.customer.id,
        paymentId: null,
        now: context.now,
      },
    );

    // false only if a concurrent request granted access first, and that
    // request sends the email
    if (enrollmentId) {
      await this.emailQueue.queue(context.tx, context.now, {
        kind: "access_granted",
        recipient: context.customer.email,
        payload: emailIds(context),
        enrollmentId,
      });
    }

    return EMAILED;
  }

  /**
   * The price is read here, on the server, never from the request. Access is
   * granted later, when Stripe confirms the payment.
   */
  private async recordPendingPayment(
    context: CheckoutContext,
  ): Promise<CheckoutDecision> {
    const { currentPrice } = context.course;

    const payment = await this.paymentsRepository.createPendingPayment(
      context.tx,
      {
        provider: "stripe",
        customerId: context.customer.id,
        coursePriceId: currentPrice.id,
        amount: currentPrice.amount,
        currency: currentPrice.currency,
      },
    );

    const { customer, course, now } = context;

    return {
      nextStep: CheckoutNextStep.PAY,
      paymentToComplete: { payment, customer, course, now },
    };
  }
}

function emailIds(context: CheckoutContext) {
  return { courseId: context.course.id, customerId: context.customer.id };
}
