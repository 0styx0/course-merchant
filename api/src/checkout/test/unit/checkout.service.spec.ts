import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StartCheckoutRequest } from "types.js";
import {
  CheckoutDecisionService,
  CheckoutNextStep,
  type CheckoutDecision,
} from "@/checkout/checkout-decision.service.js";
import { CheckoutEmailQueue } from "@/checkout/checkout-email-queue.js";
import {
  CheckoutRepository,
  type CheckoutCourse,
} from "@/checkout/checkout.repository.js";
import { CheckoutService } from "@/checkout/checkout.service.js";
import { StripeRedirectService } from "@/checkout/stripe-redirect.service.js";
import { EmailOutboxRepository } from "@/email/email-outbox.repository.js";
import { EnrollmentsRepository } from "@/enrollments/enrollments.repository.js";
import type { PaymentsConfig } from "@/payments/payments-config.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import { StripeService } from "@/payments/stripe.service.js";
import {
  asDependency,
  fakePrisma,
  type MockMethods,
} from "@/test/test-helpers.js";

const COURSE_ID = "8b0e1f5c-0000-4000-8000-000000000001";
const CUSTOMER_ID = "8b0e1f5c-0000-4000-8000-000000000002";
const PRICE_ID = "8b0e1f5c-0000-4000-8000-000000000003";
const PAYMENT_ID = "8b0e1f5c-0000-4000-8000-000000000004";
const GRANTED_ENROLLMENT_ID = "8b0e1f5c-0000-4000-8000-000000000005";

const config: PaymentsConfig = {
  stripeSecretKey: "sk_test_unit",
  stripeWebhookSecret: "whsec_unit",
  webBaseUrl: "https://courses.example.com",
};

const request: StartCheckoutRequest = {
  courseId: COURSE_ID,
  customer: { name: "Ada Lovelace", email: "ada@example.com" },
};

function makeCourse(
  overrides: { amount?: number; endsAt?: Temporal.Instant } = {},
): CheckoutCourse {
  return {
    id: COURSE_ID,
    title: "React Fundamentals",
    endsAt: overrides.endsAt ?? Temporal.Now.instant().add({ hours: 26 }),
    currentPrice: {
      id: PRICE_ID,
      amount: overrides.amount ?? 0,
      currency: "USD",
    },
  };
}

const suspendedAt = Temporal.Instant.from("2026-10-02T00:00:00Z");

describe("CheckoutService", () => {
  let checkoutRepository: MockMethods<
    CheckoutRepository,
    "findVisibleCourse" | "findOrCreateCustomer"
  >;
  let paymentsRepository: MockMethods<
    PaymentsRepository,
    | "createPendingPayment"
    | "saveProviderCheckoutId"
    | "findPaymentStatusByCheckoutId"
  >;

  beforeEach(() => {
    checkoutRepository = {
      findVisibleCourse: vi
        .fn<CheckoutRepository["findVisibleCourse"]>()
        .mockResolvedValue(makeCourse()),
      findOrCreateCustomer: vi
        .fn<CheckoutRepository["findOrCreateCustomer"]>()
        .mockResolvedValue({ id: CUSTOMER_ID, ...request.customer }),
    };
    paymentsRepository = {
      createPendingPayment: vi
        .fn<PaymentsRepository["createPendingPayment"]>()
        .mockResolvedValue({ id: PAYMENT_ID, amount: 9900, currency: "USD" }),
      saveProviderCheckoutId: vi
        .fn<PaymentsRepository["saveProviderCheckoutId"]>()
        .mockResolvedValue(undefined),
      findPaymentStatusByCheckoutId: vi
        .fn<PaymentsRepository["findPaymentStatusByCheckoutId"]>()
        .mockResolvedValue("pending"),
    };
  });

  describe("with its decision and redirect steps mocked", () => {
    let service: CheckoutService;
    let decision: MockMethods<CheckoutDecisionService, "decide">;
    let redirect: MockMethods<StripeRedirectService, "redirect">;
    let fake: ReturnType<typeof fakePrisma>;
    // whether a transaction callback is running right now
    let insideTransaction: boolean;
    let redirectedInsideTransaction: boolean | undefined;

    const paymentToComplete = {
      payment: { id: PAYMENT_ID, amount: 9900, currency: "USD" },
      customer: { id: CUSTOMER_ID, ...request.customer },
      course: makeCourse({ amount: 9900 }),
      now: Temporal.Now.instant(),
    };

    beforeEach(() => {
      insideTransaction = false;
      redirectedInsideTransaction = undefined;

      decision = {
        decide: vi
          .fn<CheckoutDecisionService["decide"]>()
          .mockResolvedValue({ nextStep: CheckoutNextStep.CHECK_EMAIL }),
      };
      redirect = {
        redirect: vi.fn<StripeRedirectService["redirect"]>(() => {
          redirectedInsideTransaction = insideTransaction;

          return Promise.resolve({
            status: "redirect",
            url: "https://checkout.stripe.com/c/pay/cs_test_123",
          });
        }),
      };
      fake = fakePrisma({
        onBegin: () => {
          insideTransaction = true;
        },
        onSettle: () => {
          insideTransaction = false;
        },
      });

      service = new CheckoutService(
        fake.prisma,
        asDependency<CheckoutRepository>(checkoutRepository),
        asDependency<PaymentsRepository>(paymentsRepository),
        asDependency<CheckoutDecisionService>(decision),
        asDependency<StripeRedirectService>(redirect),
      );
    });

    describe("course checks", () => {
      it("returns 404 COURSE_NOT_FOUND when the course isn't publicly viewable", async () => {
        checkoutRepository.findVisibleCourse.mockResolvedValue(null);

        await expect(service.startCheckout(request)).rejects.toMatchObject({
          status: 404,
          response: {
            code: "COURSE_NOT_FOUND",
            detail: `No course exists with ID ${COURSE_ID}.`,
          },
        });
        expect(decision.decide).not.toHaveBeenCalled();
      });

      it("returns 409 COURSE_NOT_PURCHASABLE once the course has ended", async () => {
        checkoutRepository.findVisibleCourse.mockResolvedValue(
          makeCourse({
            endsAt: Temporal.Now.instant().subtract({ minutes: 1 }),
          }),
        );

        await expect(service.startCheckout(request)).rejects.toMatchObject({
          status: 409,
          response: {
            code: "COURSE_NOT_PURCHASABLE",
            detail: "This course has ended and can no longer be bought.",
          },
        });
        expect(decision.decide).not.toHaveBeenCalled();
      });

      it("looks the course up outside the transaction", async () => {
        await service.startCheckout(request);

        expect(
          checkoutRepository.findVisibleCourse,
        ).toHaveBeenCalledExactlyOnceWith(
          fake.db,
          COURSE_ID,
          expect.any(Temporal.Instant),
        );
      });
    });

    describe("deciding", () => {
      it("decides inside the transaction, for the request's buyer and course", async () => {
        await service.startCheckout(request);

        expect(decision.decide).toHaveBeenCalledExactlyOnceWith(fake.tx, {
          now: expect.any(Temporal.Instant),
          course: makeCourse({ endsAt: expect.any(Temporal.Instant) }),
          buyer: request.customer,
        });
      });

      it("returns check_email without calling Stripe when the outcome was emailed", async () => {
        await expect(service.startCheckout(request)).resolves.toEqual({
          status: "check_email",
        });
        expect(redirect.redirect).not.toHaveBeenCalled();
      });

      it("redirects to Stripe for the payment the decision recorded", async () => {
        const payStep: CheckoutDecision = {
          nextStep: CheckoutNextStep.PAY,
          paymentToComplete,
        };
        decision.decide.mockResolvedValue(payStep);

        await expect(service.startCheckout(request)).resolves.toEqual({
          status: "redirect",
          url: "https://checkout.stripe.com/c/pay/cs_test_123",
        });
        expect(redirect.redirect).toHaveBeenCalledExactlyOnceWith(
          paymentToComplete,
        );
      });

      it("calls Stripe only once the transaction has finished", async () => {
        decision.decide.mockImplementation(() => {
          expect(insideTransaction).toBe(true);

          return Promise.resolve({
            nextStep: CheckoutNextStep.PAY,
            paymentToComplete,
          });
        });

        await service.startCheckout(request);

        expect(redirectedInsideTransaction).toBe(false);
      });
    });
  });

  // the real collaborators, so a wiring mistake between the classes fails here
  describe("wired to its real collaborators", () => {
    let service: CheckoutService;
    let enrollmentsRepository: MockMethods<
      EnrollmentsRepository,
      "findEnrollment" | "grantAccess"
    >;
    let emailOutbox: MockMethods<
      EmailOutboxRepository,
      "enqueue" | "countQueuedSince"
    >;
    let stripe: MockMethods<StripeService, "createCheckoutSession">;

    beforeEach(() => {
      enrollmentsRepository = {
        findEnrollment: vi
          .fn<EnrollmentsRepository["findEnrollment"]>()
          .mockResolvedValue(null),
        grantAccess: vi
          .fn<EnrollmentsRepository["grantAccess"]>()
          .mockResolvedValue(GRANTED_ENROLLMENT_ID),
      };
      emailOutbox = {
        enqueue: vi
          .fn<EmailOutboxRepository["enqueue"]>()
          .mockResolvedValue(undefined),
        countQueuedSince: vi
          .fn<EmailOutboxRepository["countQueuedSince"]>()
          .mockResolvedValue(0),
      };
      stripe = {
        createCheckoutSession: vi
          .fn<StripeService["createCheckoutSession"]>()
          .mockResolvedValue({
            id: "cs_test_123",
            url: "https://checkout.stripe.com/c/pay/cs_test_123",
          }),
      };

      const fake = fakePrisma();
      const checkoutRepo = asDependency<CheckoutRepository>(checkoutRepository);
      const paymentsRepo = asDependency<PaymentsRepository>(paymentsRepository);

      service = new CheckoutService(
        fake.prisma,
        checkoutRepo,
        paymentsRepo,
        new CheckoutDecisionService(
          checkoutRepo,
          paymentsRepo,
          asDependency<EnrollmentsRepository>(enrollmentsRepository),
          new CheckoutEmailQueue(
            asDependency<EmailOutboxRepository>(emailOutbox),
          ),
        ),
        new StripeRedirectService(
          fake.prisma,
          paymentsRepo,
          asDependency<StripeService>(stripe),
          config,
        ),
      );
    });

    it("grants a free course and emails the link", async () => {
      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "check_email",
      });
      expect(enrollmentsRepository.grantAccess).toHaveBeenCalledOnce();
      expect(emailOutbox.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ kind: "access_granted" }),
      );
    });

    it("still grants a free course but queues nothing at the email cap", async () => {
      emailOutbox.countQueuedSince.mockResolvedValue(5);

      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "check_email",
      });
      expect(enrollmentsRepository.grantAccess).toHaveBeenCalledOnce();
      expect(emailOutbox.enqueue).not.toHaveBeenCalled();
    });

    it("sends a paid course's buyer to Stripe", async () => {
      checkoutRepository.findVisibleCourse.mockResolvedValue(
        makeCourse({ amount: 9900 }),
      );

      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "redirect",
        url: "https://checkout.stripe.com/c/pay/cs_test_123",
      });
      expect(
        paymentsRepository.saveProviderCheckoutId,
      ).toHaveBeenCalledExactlyOnceWith(
        expect.anything(),
        PAYMENT_ID,
        "cs_test_123",
      );
    });

    it("emails a suspended buyer instead of charging them", async () => {
      checkoutRepository.findVisibleCourse.mockResolvedValue(
        makeCourse({ amount: 9900 }),
      );
      enrollmentsRepository.findEnrollment.mockResolvedValue({
        id: "enrollment",
        revokedAt: null,
        suspendedAt,
      });

      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "check_email",
      });
      expect(emailOutbox.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ kind: "access_suspended" }),
      );
      expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
    });
  });

  describe("getCheckoutStatus", () => {
    let service: CheckoutService;
    let fake: ReturnType<typeof fakePrisma>;

    beforeEach(() => {
      fake = fakePrisma();
      service = new CheckoutService(
        fake.prisma,
        asDependency<CheckoutRepository>(checkoutRepository),
        asDependency<PaymentsRepository>(paymentsRepository),
        asDependency<CheckoutDecisionService>({}),
        asDependency<StripeRedirectService>({}),
      );
    });

    it.each(["pending", "succeeded", "expired", "refunded"] as const)(
      "reports a %s payment",
      async (status) => {
        paymentsRepository.findPaymentStatusByCheckoutId.mockResolvedValue(
          status,
        );

        await expect(service.getCheckoutStatus("cs_test_123")).resolves.toEqual(
          { status },
        );
      },
    );

    it("looks the payment up by its Stripe session id", async () => {
      await service.getCheckoutStatus("cs_test_123");

      expect(
        paymentsRepository.findPaymentStatusByCheckoutId,
      ).toHaveBeenCalledExactlyOnceWith(fake.db, "stripe", "cs_test_123");
    });

    it("returns 404 CHECKOUT_NOT_FOUND for an unknown session", async () => {
      paymentsRepository.findPaymentStatusByCheckoutId.mockResolvedValue(null);

      await expect(
        service.getCheckoutStatus("cs_test_unknown"),
      ).rejects.toMatchObject({
        status: 404,
        response: {
          code: "CHECKOUT_NOT_FOUND",
          detail: "No checkout exists with ID cs_test_unknown.",
        },
      });
    });
  });
});
