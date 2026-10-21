import { Inject, Injectable } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";

import type { DbScope, StartCheckoutRequest, StartCheckoutResponse } from "types.js";
import { ApiException } from "@/common/errors/api.exception.js";
import { ErrorCodeCheckout } from "@/common/errors/error-codes.js";
import { PAYMENTS_CONFIG, type PaymentsConfig } from "@/config/payments-config.js";
import { courseNotFound } from "@/courses/course-errors.js";
import { EmailOutboxRepository, type QueuedEmail } from "@/email/email-outbox.repository.js";
import { PaymentProviderUnavailableError, StripeService } from "@/payments/stripe.service.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import {
  CheckoutRepository,
  type CheckoutCourse,
  type CheckoutCustomer,
  type PendingPayment,
} from "./checkout.repository.js";
import { EnrollmentAccess, enrollmentAccess } from "./enrollment-access.js";

// Anyone can start a checkout for any address, so cap how many emails one
// inbox receives. Over the cap the response is unchanged; nothing is queued.
const CHECKOUT_EMAIL_LIMIT = 5;
const CHECKOUT_EMAIL_WINDOW = { hours: 24 };

// Stripe requires at least 30 minutes from when it creates the session, so
// allow a minute for the request to reach it
const CHECKOUT_EXPIRES_AFTER = { minutes: 31 };

const CHECK_EMAIL: StartCheckoutResponse = { status: "check_email" };

/** Everything the outcome handlers need about one checkout attempt. */
type CheckoutContext = {
  tx: DbScope;
  now: Temporal.Instant;
  course: CheckoutCourse;
  customer: CheckoutCustomer;
};

enum CheckoutNextStep {
  // the outcome was emailed; nothing left to do
  CHECK_EMAIL = "CHECK_EMAIL",
  // a pending payment was recorded; send the buyer to Stripe
  PAY = "PAY",
}

/** A recorded payment the buyer still has to complete on Stripe. */
type PaymentToComplete = {
  payment: PendingPayment;
  customer: CheckoutCustomer;
  course: CheckoutCourse;
  now: Temporal.Instant;
};

type CheckoutDecision =
  | { nextStep: CheckoutNextStep.CHECK_EMAIL }
  | { nextStep: CheckoutNextStep.PAY; paymentToComplete: PaymentToComplete };

const EMAILED: CheckoutDecision = { nextStep: CheckoutNextStep.CHECK_EMAIL };

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(CheckoutRepository)
    private readonly checkoutRepository: CheckoutRepository,
    @Inject(EmailOutboxRepository)
    private readonly emailOutbox: EmailOutboxRepository,
    @Inject(StripeService)
    private readonly stripe: StripeService,
    @Inject(PAYMENTS_CONFIG)
    private readonly config: PaymentsConfig,
  ) {}

  /**
   * Starts buying a course. The response never reveals whether the email
   * already owns it: owners, suspended buyers and free enrollments all get
   * `check_email`, with the details in the email itself.
   */
  async startCheckout(
    request: StartCheckoutRequest,
  ): Promise<StartCheckoutResponse> {
    const now = Temporal.Now.instant();
    const course = await this.findPurchasableCourse(request.courseId, now);
    const decision = await this.decideCheckout(request, course, now);

    // Stripe is called only after the transaction commits: a network call
    // inside it would hold the connection and couldn't be rolled back
    if (decision.nextStep === CheckoutNextStep.PAY) {
      return this.redirectToStripe(decision.paymentToComplete);
    }

    return CHECK_EMAIL;
  }

  /**
   * In one transaction: identifies the buyer, then either emails them the
   * outcome or records a pending payment for them to complete.
   */
  private decideCheckout(
    request: StartCheckoutRequest,
    course: CheckoutCourse,
    now: Temporal.Instant,
  ): Promise<CheckoutDecision> {
    return this.prisma.db.transaction(async (tx) => {
      const customer = await this.checkoutRepository.findOrCreateCustomer(tx, {
        email: request.email,
        name: request.name,
      });

      const enrollment = await this.checkoutRepository.findEnrollment(
        tx,
        course.id,
        customer.id,
      );

      const context = { tx, now, course, customer };

      return this.respondToAccess(enrollmentAccess(enrollment), context);
    });
  }

  /**
   * The course a buyer may pay for: publicly viewable (same rule as
   * getCourse) and not yet ended.
   */
  private async findPurchasableCourse(
    courseId: string,
    now: Temporal.Instant,
  ): Promise<CheckoutCourse> {
    const course = await this.checkoutRepository.findVisibleCourse(
      this.prisma.db,
      courseId,
      now,
    );

    if (!course) {
      throw courseNotFound(courseId);
    }

    const hasEnded = Temporal.Instant.compare(course.endsAt, now) <= 0;

    if (hasEnded) {
      throw new ApiException(ErrorCodeCheckout.COURSE_NOT_PURCHASABLE, {
        detail: "This course has ended and can no longer be bought.",
      });
    }

    return course;
  }

  private respondToAccess(
    access: EnrollmentAccess,
    context: CheckoutContext,
  ): Promise<CheckoutDecision> {
    switch (access) {
      case EnrollmentAccess.ACTIVE:
        return this.resendCourseLink(context);
      case EnrollmentAccess.SUSPENDED:
        return this.explainSuspension(context);
      // no access yet, or a refund removed it: the buyer can buy (again)
      case EnrollmentAccess.NONE:
      case EnrollmentAccess.REVOKED:
        return this.sellCourse(context);
    }
  }

  private async resendCourseLink(
    context: CheckoutContext,
  ): Promise<CheckoutDecision> {
    await this.queueCheckoutEmail(context, {
      kind: "already_owned",
      recipient: context.customer.email,
      payload: { ...emailIds(context), refundIssued: false },
    });

    return EMAILED;
  }

  private async explainSuspension(
    context: CheckoutContext,
  ): Promise<CheckoutDecision> {
    await this.queueCheckoutEmail(context, {
      kind: "access_suspended",
      recipient: context.customer.email,
      payload: emailIds(context),
    });

    return EMAILED;
  }

  private sellCourse(
    context: CheckoutContext,
  ): Promise<CheckoutDecision> {
    const isFree = context.course.currentPrice.amount === 0;

    return isFree
      ? this.enrollInFreeCourse(context)
      : this.recordPendingPayment(context);
  }

  private async enrollInFreeCourse(
    context: CheckoutContext,
  ): Promise<CheckoutDecision> {
    const accessGranted = await this.checkoutRepository.grantFreeAccess(
      context.tx,
      context.course.id,
      context.customer.id,
      context.now,
    );

    // false only if a concurrent request granted access first, and that
    // request sends the email
    if (accessGranted) {
      await this.queueCheckoutEmail(context, {
        kind: "access_granted",
        recipient: context.customer.email,
        payload: emailIds(context),
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

    const payment = await this.checkoutRepository.createPendingPayment(
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

  private async redirectToStripe(
    paymentToComplete: PaymentToComplete,
  ): Promise<StartCheckoutResponse> {
    const session = await this.createStripeSession(paymentToComplete);

    await this.checkoutRepository.saveProviderCheckoutId(
      this.prisma.db,
      paymentToComplete.payment.id,
      session.id,
    );

    return { status: "redirect", url: session.url };
  }

  /**
   * If Stripe can't be reached, the pending payment stays without a session
   * and the buyer is asked to retry, which starts a fresh attempt.
   */
  private async createStripeSession({
    payment,
    customer,
    course,
    now,
  }: PaymentToComplete) {
    try {
      return await this.stripe
        .createCheckoutSession({
          paymentId: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          courseName: course.title,
          customerEmail: customer.email,
          successUrl: `${this.config.webBaseUrl}/checkout/success`,
          cancelUrl: `${this.config.webBaseUrl}/courses/${course.id}`,
          expiresAt: now.add(CHECKOUT_EXPIRES_AFTER),
        });
    } catch (error) {
      if (error instanceof PaymentProviderUnavailableError) {
        throw new ApiException(ErrorCodeCheckout.PAYMENT_PROVIDER_UNAVAILABLE, {
          detail: "Payments can't be taken right now. Try again later.",
        });
      }

      throw error;
    }
  }

  private async queueCheckoutEmail(
    context: CheckoutContext,
    email: QueuedEmail,
  ): Promise<void> {
    const recentlyQueued = await this.emailOutbox.countQueuedSince(
      context.tx,
      email.recipient,
      context.now.subtract(CHECKOUT_EMAIL_WINDOW),
    );

    const isOverLimit = recentlyQueued >= CHECKOUT_EMAIL_LIMIT;

    if (isOverLimit) {
      return;
    }

    await this.emailOutbox.enqueue(context.tx, email);
  }
}

function emailIds(context: CheckoutContext) {
  return { courseId: context.course.id, customerId: context.customer.id };
}
