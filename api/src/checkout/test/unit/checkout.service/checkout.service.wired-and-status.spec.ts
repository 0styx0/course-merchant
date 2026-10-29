import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutDecisionService } from "@/checkout/checkout-decision.service.js";
import { CheckoutEmailQueue } from "@/checkout/checkout-email-queue.js";
import { CheckoutRepository } from "@/checkout/checkout.repository.js";
import { CheckoutService } from "@/checkout/checkout.service.js";
import { StripeRedirectService } from "@/checkout/stripe-redirect.service.js";
import { EmailOutboxRepository } from "@/email/outbox/email-outbox.repository.js";
import { EnrollmentsRepository } from "@/enrollments/enrollments.repository.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import { StripeService } from "@/payments/stripe/stripe.service.js";
import {
  asDependency,
  fakePrisma,
  type MockMethods,
} from "@/test/test-helpers.js";
import {
  CUSTOMER_ID,
  PAYMENT_ID,
  GRANTED_ENROLLMENT_ID,
  config,
  request,
  makeCourse,
  suspendedAt,
} from "@/checkout/test/unit/checkout.service/checkout.service.fixtures.js";

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
