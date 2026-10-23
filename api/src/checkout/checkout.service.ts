import { Inject, Injectable } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";

import type {
  CheckoutStatusResponse,
  StartCheckoutRequest,
  StartCheckoutResponse,
} from "types.js";
import { ApiException } from "@/common/errors/api.exception.js";
import { ErrorCodeCheckout } from "@/common/errors/error-codes.js";
import { courseNotFound } from "@/courses/course-errors.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import {
  CheckoutDecisionService,
  CheckoutNextStep,
} from "./checkout-decision.service.js";
import {
  CheckoutRepository,
  type CheckoutCourse,
} from "./checkout.repository.js";
import { StripeRedirectService } from "./stripe-redirect.service.js";

const CHECK_EMAIL: StartCheckoutResponse = { status: "check_email" };

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(CheckoutRepository)
    private readonly checkoutRepository: CheckoutRepository,
    @Inject(PaymentsRepository)
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(CheckoutDecisionService)
    private readonly checkoutDecision: CheckoutDecisionService,
    @Inject(StripeRedirectService)
    private readonly stripeRedirect: StripeRedirectService,
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
    const decision = await this.prisma.db.transaction((tx) =>
      this.checkoutDecision.decide(tx, {
        now,
        course,
        buyer: request.customer,
      }),
    );

    // Stripe is called only after the transaction commits: a network call
    // inside it would hold the connection and couldn't be rolled back
    if (decision.nextStep === CheckoutNextStep.PAY) {
      return this.stripeRedirect.redirect(decision.paymentToComplete);
    }

    return CHECK_EMAIL;
  }

  /**
   * How a paid checkout ended, for the page the buyer returns to. Read from
   * our own records, so it only reports what Stripe has confirmed to us.
   */
  async getCheckoutStatus(checkoutId: string): Promise<CheckoutStatusResponse> {
    const status = await this.paymentsRepository.findPaymentStatusByCheckoutId(
      this.prisma.db,
      "stripe",
      checkoutId,
    );

    if (!status) {
      throw new ApiException(ErrorCodeCheckout.CHECKOUT_NOT_FOUND, {
        detail: `No checkout exists with ID ${checkoutId}.`,
      });
    }

    return { status };
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
}
