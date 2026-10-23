import { Inject, Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";

import type { StartCheckoutResponse } from "types.js";
import { ApiException } from "@/common/errors/api.exception.js";
import { ErrorCodeCheckout } from "@/common/errors/error-codes.js";
import {
  PAYMENTS_CONFIG,
  type PaymentsConfig,
} from "@/payments/payments-config.js";
import {
  PaymentsRepository,
  type PendingPayment,
} from "@/payments/payments.repository.js";
import {
  PaymentProviderUnavailableError,
  StripeService,
} from "@/payments/stripe.service.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import type {
  CheckoutCourse,
  CheckoutCustomer,
} from "./checkout.repository.js";

// Stripe requires at least 30 minutes from when it creates the session, so
// allow a minute for the request to reach it
const CHECKOUT_EXPIRES_AFTER = { minutes: 31 };

/** A recorded payment the buyer still has to complete on Stripe. */
export type PaymentToComplete = {
  payment: PendingPayment;
  customer: CheckoutCustomer;
  course: CheckoutCourse;
  now: Temporal.Instant;
};

/**
 * Sends a buyer to Stripe for a payment already recorded. Runs after the
 * recording transaction has committed, never inside it.
 */
@Injectable()
export class StripeRedirectService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(PaymentsRepository)
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(StripeService)
    private readonly stripe: StripeService,
    @Inject(PAYMENTS_CONFIG)
    private readonly config: PaymentsConfig,
  ) {}

  async redirect(
    paymentToComplete: PaymentToComplete,
  ): Promise<StartCheckoutResponse> {
    const session = await this.createStripeSession(paymentToComplete);

    await this.paymentsRepository.saveProviderCheckoutId(
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
      return await this.stripe.createCheckoutSession({
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
}
