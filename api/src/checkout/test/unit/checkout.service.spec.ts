import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StartCheckoutRequest } from "types.js";
import {
  CheckoutRepository,
  type CheckoutCourse,
} from "@/checkout/checkout.repository.js";
import { CheckoutService } from "@/checkout/checkout.service.js";
import type { PaymentsConfig } from "@/payments/payments-config.js";
import { EmailOutboxRepository } from "@/email/email-outbox.repository.js";
import { EnrollmentsRepository } from "@/enrollments/enrollments.repository.js";
import {
  PaymentProviderUnavailableError,
  StripeService,
} from "@/payments/stripe.service.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
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

const revokedAt = Temporal.Instant.from("2026-10-01T00:00:00Z");
const suspendedAt = Temporal.Instant.from("2026-10-02T00:00:00Z");

describe("CheckoutService", () => {
  let service: CheckoutService;
  let enrollmentsRepository: MockMethods<
    EnrollmentsRepository,
    "findEnrollment" | "grantAccess"
  >;
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
  let emailOutbox: MockMethods<
    EmailOutboxRepository,
    "enqueue" | "countQueuedSince"
  >;
  let stripe: MockMethods<StripeService, "createCheckoutSession">;
  let fake: ReturnType<typeof fakePrisma>;
  // the scope the service passes to repositories inside its transaction
  let tx: ReturnType<typeof fakePrisma>["tx"];
  // the order transactions commit and Stripe is called in
  let events: string[];

  beforeEach(() => {
    enrollmentsRepository = {
      findEnrollment: vi
        .fn<EnrollmentsRepository["findEnrollment"]>()
        .mockResolvedValue(null),
      grantAccess: vi
        .fn<EnrollmentsRepository["grantAccess"]>()
        .mockResolvedValue(GRANTED_ENROLLMENT_ID),
    };
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
    emailOutbox = {
      enqueue: vi
        .fn<EmailOutboxRepository["enqueue"]>()
        .mockResolvedValue(undefined),
      countQueuedSince: vi
        .fn<EmailOutboxRepository["countQueuedSince"]>()
        .mockResolvedValue(0),
    };

    events = [];
    stripe = {
      createCheckoutSession: vi.fn<StripeService["createCheckoutSession"]>(
        () => {
          events.push("stripe called");

          return Promise.resolve({
            id: "cs_test_123",
            url: "https://checkout.stripe.com/c/pay/cs_test_123",
          });
        },
      ),
    };

    fake = fakePrisma({
      onCommit: () => {
        events.push("transaction committed");
      },
    });
    tx = fake.tx;

    service = new CheckoutService(
      fake.prisma,
      asDependency<CheckoutRepository>(checkoutRepository),
      asDependency<PaymentsRepository>(paymentsRepository),
      asDependency<EnrollmentsRepository>(enrollmentsRepository),
      asDependency<EmailOutboxRepository>(emailOutbox),
      asDependency<StripeService>(stripe),
      config,
    );
  });

  const emailIds = { courseId: COURSE_ID, customerId: CUSTOMER_ID };

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
      expect(checkoutRepository.findOrCreateCustomer).not.toHaveBeenCalled();
    });

    it("returns 409 COURSE_NOT_PURCHASABLE once the course has ended", async () => {
      checkoutRepository.findVisibleCourse.mockResolvedValue(
        makeCourse({ endsAt: Temporal.Now.instant().subtract({ minutes: 1 }) }),
      );

      await expect(service.startCheckout(request)).rejects.toMatchObject({
        status: 409,
        response: {
          code: "COURSE_NOT_PURCHASABLE",
          detail: "This course has ended and can no longer be bought.",
        },
      });
      expect(checkoutRepository.findOrCreateCustomer).not.toHaveBeenCalled();
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

    it("creates the customer with the request's name and email", async () => {
      await service.startCheckout(request);

      expect(checkoutRepository.findOrCreateCustomer).toHaveBeenCalledWith(tx, {
        email: "ada@example.com",
        name: "Ada Lovelace",
      });
    });
  });

  describe("a buyer who already has access", () => {
    beforeEach(() => {
      enrollmentsRepository.findEnrollment.mockResolvedValue({
        id: "enrollment",
        revokedAt: null,
        suspendedAt: null,
      });
    });

    it("emails them their link and returns check_email", async () => {
      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "check_email",
      });
      expect(emailOutbox.enqueue).toHaveBeenCalledExactlyOnceWith(tx, {
        kind: "already_owned",
        recipient: "ada@example.com",
        payload: { ...emailIds, refundIssued: false },
        enrollmentId: "enrollment",
      });
      expect(enrollmentsRepository.grantAccess).not.toHaveBeenCalled();
    });

    it("answers the same way for a paid course, without charging again", async () => {
      checkoutRepository.findVisibleCourse.mockResolvedValue(
        makeCourse({ amount: 9900 }),
      );

      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "check_email",
      });
      expect(paymentsRepository.createPendingPayment).not.toHaveBeenCalled();
      expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
    });
  });

  describe("a suspended buyer", () => {
    it.each([
      ["suspended", { revokedAt: null, suspendedAt }],
      ["suspended and refunded", { revokedAt, suspendedAt }],
    ])("is emailed without a link when %s", async (_label, timestamps) => {
      enrollmentsRepository.findEnrollment.mockResolvedValue({
        id: "enrollment",
        ...timestamps,
      });

      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "check_email",
      });
      expect(emailOutbox.enqueue).toHaveBeenCalledExactlyOnceWith(tx, {
        kind: "access_suspended",
        recipient: "ada@example.com",
        payload: { ...emailIds, refundIssued: false },
        enrollmentId: "enrollment",
      });
      expect(enrollmentsRepository.grantAccess).not.toHaveBeenCalled();
    });
  });

  describe("a free course", () => {
    it.each([
      ["a new buyer", null],
      ["a refunded buyer", { id: "enrollment", revokedAt, suspendedAt: null }],
    ])(
      "grants access to %s and emails the link",
      async (_label, enrollment) => {
        enrollmentsRepository.findEnrollment.mockResolvedValue(enrollment);

        await expect(service.startCheckout(request)).resolves.toEqual({
          status: "check_email",
        });
        expect(enrollmentsRepository.grantAccess).toHaveBeenCalledWith(tx, {
          courseId: COURSE_ID,
          customerId: CUSTOMER_ID,
          paymentId: null,
          now: expect.any(Temporal.Instant),
        });
        expect(emailOutbox.enqueue).toHaveBeenCalledExactlyOnceWith(tx, {
          kind: "access_granted",
          recipient: "ada@example.com",
          payload: emailIds,
          enrollmentId: GRANTED_ENROLLMENT_ID,
        });
      },
    );

    it("sends nothing when a concurrent request granted access first", async () => {
      enrollmentsRepository.grantAccess.mockResolvedValue(null);

      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "check_email",
      });
      expect(emailOutbox.enqueue).not.toHaveBeenCalled();
    });
  });

  describe("the per-address email cap", () => {
    it("counts the recipient's emails over the last 24 hours", async () => {
      const before = Temporal.Now.instant();
      await service.startCheckout(request);
      const after = Temporal.Now.instant();

      const [scope, recipient, since] =
        emailOutbox.countQueuedSince.mock.calls[0];

      expect(scope).toBe(tx);
      expect(recipient).toBe("ada@example.com");
      expect(
        Temporal.Instant.compare(since, before.subtract({ hours: 24 })),
      ).toBeGreaterThanOrEqual(0);
      expect(
        Temporal.Instant.compare(since, after.subtract({ hours: 24 })),
      ).toBeLessThanOrEqual(0);
    });

    it("queues below the cap", async () => {
      emailOutbox.countQueuedSince.mockResolvedValue(4);

      await service.startCheckout(request);

      expect(emailOutbox.enqueue).toHaveBeenCalledOnce();
    });

    it("still grants free access but queues nothing at the cap", async () => {
      emailOutbox.countQueuedSince.mockResolvedValue(5);

      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "check_email",
      });
      expect(enrollmentsRepository.grantAccess).toHaveBeenCalled();
      expect(emailOutbox.enqueue).not.toHaveBeenCalled();
    });
  });

  describe("a paid course", () => {
    beforeEach(() => {
      checkoutRepository.findVisibleCourse.mockResolvedValue(
        makeCourse({ amount: 9900 }),
      );
    });

    it("redirects the buyer to Stripe's checkout page", async () => {
      await expect(service.startCheckout(request)).resolves.toEqual({
        status: "redirect",
        url: "https://checkout.stripe.com/c/pay/cs_test_123",
      });
    });

    it.each([
      ["a new buyer", null],
      ["a refunded buyer", { id: "enrollment", revokedAt, suspendedAt: null }],
    ])(
      "records a pending payment at the current price for %s",
      async (_label, enrollment) => {
        enrollmentsRepository.findEnrollment.mockResolvedValue(enrollment);

        await service.startCheckout(request);

        expect(
          paymentsRepository.createPendingPayment,
        ).toHaveBeenCalledExactlyOnceWith(tx, {
          provider: "stripe",
          customerId: CUSTOMER_ID,
          coursePriceId: PRICE_ID,
          amount: 9900,
          currency: "USD",
        });
      },
    );

    it("creates the Stripe session for that payment", async () => {
      const before = Temporal.Now.instant();
      await service.startCheckout(request);
      const after = Temporal.Now.instant();

      expect(stripe.createCheckoutSession).toHaveBeenCalledExactlyOnceWith({
        paymentId: PAYMENT_ID,
        amount: 9900,
        currency: "USD",
        courseName: "React Fundamentals",
        customerEmail: "ada@example.com",
        successUrl: "https://courses.example.com/checkout/success",
        cancelUrl: `https://courses.example.com/courses/${COURSE_ID}`,
        expiresAt: expect.any(Temporal.Instant),
      });

      const { expiresAt } = stripe.createCheckoutSession.mock.calls[0][0];

      expect(
        Temporal.Instant.compare(expiresAt, before.add({ minutes: 31 })),
      ).toBeGreaterThanOrEqual(0);
      expect(
        Temporal.Instant.compare(expiresAt, after.add({ minutes: 31 })),
      ).toBeLessThanOrEqual(0);
    });

    it("calls Stripe only after the transaction has committed", async () => {
      await service.startCheckout(request);

      expect(events).toEqual(["transaction committed", "stripe called"]);
    });

    it("saves the session id on the payment outside the transaction", async () => {
      await service.startCheckout(request);

      expect(
        paymentsRepository.saveProviderCheckoutId,
      ).toHaveBeenCalledExactlyOnceWith(fake.db, PAYMENT_ID, "cs_test_123");
    });

    it("queues no email; access is granted once Stripe confirms payment", async () => {
      await service.startCheckout(request);

      expect(emailOutbox.enqueue).not.toHaveBeenCalled();
      expect(enrollmentsRepository.grantAccess).not.toHaveBeenCalled();
    });

    it("returns 503 PAYMENT_PROVIDER_UNAVAILABLE when Stripe can't be reached", async () => {
      stripe.createCheckoutSession.mockRejectedValue(
        new PaymentProviderUnavailableError(),
      );

      await expect(service.startCheckout(request)).rejects.toMatchObject({
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

      await expect(service.startCheckout(request)).rejects.toBe(error);
    });
  });

  describe("getCheckoutStatus", () => {
    it.each(["pending", "succeeded", "expired", "refunded"] as const)(
      "reports a %s payment",
      async (status) => {
        paymentsRepository.findPaymentStatusByCheckoutId.mockResolvedValue(
          status,
        );

        await expect(service.getCheckoutStatus("cs_test_123")).resolves.toEqual(
          {
            status,
          },
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
