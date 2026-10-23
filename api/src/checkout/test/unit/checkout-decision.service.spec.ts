import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CheckoutDecisionService,
  CheckoutNextStep,
  type CheckoutAttempt,
} from "@/checkout/checkout-decision.service.js";
import { CheckoutEmailQueue } from "@/checkout/checkout-email-queue.js";
import {
  CheckoutRepository,
  type CheckoutCourse,
} from "@/checkout/checkout.repository.js";
import { EnrollmentsRepository } from "@/enrollments/enrollments.repository.js";
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

const now = Temporal.Instant.from("2026-10-23T12:00:00Z");
const revokedAt = Temporal.Instant.from("2026-10-01T00:00:00Z");
const suspendedAt = Temporal.Instant.from("2026-10-02T00:00:00Z");

const buyer = { name: "Ada Lovelace", email: "ada@example.com" };
const customer = { id: CUSTOMER_ID, ...buyer };
const emailIds = { courseId: COURSE_ID, customerId: CUSTOMER_ID };

function makeCourse(amount: number): CheckoutCourse {
  return {
    id: COURSE_ID,
    title: "React Fundamentals",
    endsAt: now.add({ hours: 26 }),
    currentPrice: { id: PRICE_ID, amount, currency: "USD" },
  };
}

describe("CheckoutDecisionService", () => {
  let service: CheckoutDecisionService;
  let checkoutRepository: MockMethods<
    CheckoutRepository,
    "findOrCreateCustomer"
  >;
  let paymentsRepository: MockMethods<
    PaymentsRepository,
    "createPendingPayment"
  >;
  let enrollmentsRepository: MockMethods<
    EnrollmentsRepository,
    "findEnrollment" | "grantAccess"
  >;
  let emailQueue: MockMethods<CheckoutEmailQueue, "queue">;
  let tx: ReturnType<typeof fakePrisma>["tx"];
  let attempt: CheckoutAttempt;

  beforeEach(() => {
    checkoutRepository = {
      findOrCreateCustomer: vi
        .fn<CheckoutRepository["findOrCreateCustomer"]>()
        .mockResolvedValue(customer),
    };
    paymentsRepository = {
      createPendingPayment: vi
        .fn<PaymentsRepository["createPendingPayment"]>()
        .mockResolvedValue({ id: PAYMENT_ID, amount: 9900, currency: "USD" }),
    };
    enrollmentsRepository = {
      findEnrollment: vi
        .fn<EnrollmentsRepository["findEnrollment"]>()
        .mockResolvedValue(null),
      grantAccess: vi
        .fn<EnrollmentsRepository["grantAccess"]>()
        .mockResolvedValue(GRANTED_ENROLLMENT_ID),
    };
    emailQueue = {
      queue: vi.fn<CheckoutEmailQueue["queue"]>().mockResolvedValue(undefined),
    };
    tx = fakePrisma().tx;
    attempt = { now, course: makeCourse(0), buyer };

    service = new CheckoutDecisionService(
      asDependency<CheckoutRepository>(checkoutRepository),
      asDependency<PaymentsRepository>(paymentsRepository),
      asDependency<EnrollmentsRepository>(enrollmentsRepository),
      asDependency<CheckoutEmailQueue>(emailQueue),
    );
  });

  it("creates the customer with the buyer's name and email", async () => {
    await service.decide(tx, attempt);

    expect(
      checkoutRepository.findOrCreateCustomer,
    ).toHaveBeenCalledExactlyOnceWith(tx, buyer);
  });

  describe("a buyer who already has access", () => {
    beforeEach(() => {
      enrollmentsRepository.findEnrollment.mockResolvedValue({
        id: "enrollment",
        revokedAt: null,
        suspendedAt: null,
      });
    });

    it("emails them their link", async () => {
      await expect(service.decide(tx, attempt)).resolves.toEqual({
        nextStep: CheckoutNextStep.CHECK_EMAIL,
      });
      expect(emailQueue.queue).toHaveBeenCalledExactlyOnceWith(tx, now, {
        kind: "already_owned",
        recipient: "ada@example.com",
        payload: { ...emailIds, refundIssued: false },
        enrollmentId: "enrollment",
      });
      expect(enrollmentsRepository.grantAccess).not.toHaveBeenCalled();
    });

    it("answers the same way for a paid course, without charging again", async () => {
      attempt = { ...attempt, course: makeCourse(9900) };

      await expect(service.decide(tx, attempt)).resolves.toEqual({
        nextStep: CheckoutNextStep.CHECK_EMAIL,
      });
      expect(paymentsRepository.createPendingPayment).not.toHaveBeenCalled();
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

      await expect(service.decide(tx, attempt)).resolves.toEqual({
        nextStep: CheckoutNextStep.CHECK_EMAIL,
      });
      expect(emailQueue.queue).toHaveBeenCalledExactlyOnceWith(tx, now, {
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

        await expect(service.decide(tx, attempt)).resolves.toEqual({
          nextStep: CheckoutNextStep.CHECK_EMAIL,
        });
        expect(enrollmentsRepository.grantAccess).toHaveBeenCalledWith(tx, {
          courseId: COURSE_ID,
          customerId: CUSTOMER_ID,
          paymentId: null,
          now,
        });
        expect(emailQueue.queue).toHaveBeenCalledExactlyOnceWith(tx, now, {
          kind: "access_granted",
          recipient: "ada@example.com",
          payload: emailIds,
          enrollmentId: GRANTED_ENROLLMENT_ID,
        });
      },
    );

    it("sends nothing when a concurrent request granted access first", async () => {
      enrollmentsRepository.grantAccess.mockResolvedValue(null);

      await expect(service.decide(tx, attempt)).resolves.toEqual({
        nextStep: CheckoutNextStep.CHECK_EMAIL,
      });
      expect(emailQueue.queue).not.toHaveBeenCalled();
    });
  });

  describe("a paid course", () => {
    beforeEach(() => {
      attempt = { ...attempt, course: makeCourse(9900) };
    });

    it.each([
      ["a new buyer", null],
      ["a refunded buyer", { id: "enrollment", revokedAt, suspendedAt: null }],
    ])(
      "records a pending payment at the current price for %s",
      async (_label, enrollment) => {
        enrollmentsRepository.findEnrollment.mockResolvedValue(enrollment);

        await service.decide(tx, attempt);

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

    it("hands back the payment the buyer still has to complete", async () => {
      await expect(service.decide(tx, attempt)).resolves.toEqual({
        nextStep: CheckoutNextStep.PAY,
        paymentToComplete: {
          payment: { id: PAYMENT_ID, amount: 9900, currency: "USD" },
          customer,
          course: attempt.course,
          now,
        },
      });
    });

    it("queues no email; access is granted once Stripe confirms payment", async () => {
      await service.decide(tx, attempt);

      expect(emailQueue.queue).not.toHaveBeenCalled();
      expect(enrollmentsRepository.grantAccess).not.toHaveBeenCalled();
    });
  });
});
