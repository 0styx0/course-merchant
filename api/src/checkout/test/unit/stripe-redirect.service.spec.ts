import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  StripeRedirectService,
  type PaymentToComplete,
} from "@/checkout/stripe-redirect.service.js";
import type { PaymentsConfig } from "@/payments/payments-config.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import {
  PaymentProviderUnavailableError,
  StripeService,
} from "@/payments/stripe/stripe.service.js";
import {
  asDependency,
  fakePrisma,
  type MockMethods,
} from "@/test/test-helpers.js";

const COURSE_ID = "8b0e1f5c-0000-4000-8000-000000000001";
const PAYMENT_ID = "8b0e1f5c-0000-4000-8000-000000000004";

const config: PaymentsConfig = {
  stripeSecretKey: "sk_test_unit",
  stripeWebhookSecret: "whsec_unit",
  webBaseUrl: "https://courses.example.com",
};

const now = Temporal.Instant.from("2026-10-23T12:00:00Z");

const paymentToComplete: PaymentToComplete = {
  payment: { id: PAYMENT_ID, amount: 9900, currency: "USD" },
  customer: {
    id: "8b0e1f5c-0000-4000-8000-000000000002",
    name: "Ada Lovelace",
    email: "ada@example.com",
  },
  course: {
    id: COURSE_ID,
    title: "React Fundamentals",
    endsAt: now.add({ hours: 26 }),
    currentPrice: {
      id: "8b0e1f5c-0000-4000-8000-000000000003",
      amount: 9900,
      currency: "USD",
    },
  },
  now,
};

describe("StripeRedirectService", () => {
  let service: StripeRedirectService;
  let paymentsRepository: MockMethods<
    PaymentsRepository,
    "saveProviderCheckoutId"
  >;
  let stripe: MockMethods<StripeService, "createCheckoutSession">;
  let fake: ReturnType<typeof fakePrisma>;

  beforeEach(() => {
    paymentsRepository = {
      saveProviderCheckoutId: vi
        .fn<PaymentsRepository["saveProviderCheckoutId"]>()
        .mockResolvedValue(undefined),
    };
    stripe = {
      createCheckoutSession: vi
        .fn<StripeService["createCheckoutSession"]>()
        .mockResolvedValue({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/c/pay/cs_test_123",
        }),
    };
    fake = fakePrisma();
    service = new StripeRedirectService(
      fake.prisma,
      asDependency<PaymentsRepository>(paymentsRepository),
      asDependency<StripeService>(stripe),
      config,
    );
  });

  it("redirects the buyer to Stripe's checkout page", async () => {
    await expect(service.redirect(paymentToComplete)).resolves.toEqual({
      status: "redirect",
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
  });

  it("creates the Stripe session for that payment", async () => {
    await service.redirect(paymentToComplete);

    expect(stripe.createCheckoutSession).toHaveBeenCalledExactlyOnceWith({
      paymentId: PAYMENT_ID,
      amount: 9900,
      currency: "USD",
      courseName: "React Fundamentals",
      customerEmail: "ada@example.com",
      successUrl: "https://courses.example.com/checkout/success",
      cancelUrl: `https://courses.example.com/courses/${COURSE_ID}`,
      expiresAt: now.add({ minutes: 31 }),
    });
  });

  it("saves the session id on the payment outside any transaction", async () => {
    await service.redirect(paymentToComplete);

    expect(
      paymentsRepository.saveProviderCheckoutId,
    ).toHaveBeenCalledExactlyOnceWith(fake.db, PAYMENT_ID, "cs_test_123");
  });

  it("returns 503 PAYMENT_PROVIDER_UNAVAILABLE when Stripe can't be reached", async () => {
    stripe.createCheckoutSession.mockRejectedValue(
      new PaymentProviderUnavailableError(),
    );

    await expect(service.redirect(paymentToComplete)).rejects.toMatchObject({
      status: 503,
      response: {
        code: "PAYMENT_PROVIDER_UNAVAILABLE",
        detail: "Payments can't be taken right now. Try again later.",
      },
    });
    expect(paymentsRepository.saveProviderCheckoutId).not.toHaveBeenCalled();
  });

  it("lets other Stripe errors through", async () => {
    const error = new Error("Invalid currency: zzz");
    stripe.createCheckoutSession.mockRejectedValue(error);

    await expect(service.redirect(paymentToComplete)).rejects.toBe(error);
  });
});
