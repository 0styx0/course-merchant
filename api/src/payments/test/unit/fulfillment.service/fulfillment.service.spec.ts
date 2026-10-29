import { Logger } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EmailOutboxRepository } from "@/email/outbox/email-outbox.repository.js";
import { EnrollmentsRepository } from "@/enrollments/enrollments.repository.js";
import { FulfillmentService } from "@/payments/fulfillment/fulfillment.service.js";
import { PaymentRefunds } from "@/payments/payment-refunds.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import {
  asDependency,
  fakePrisma,
  type MockMethods,
} from "@/test/test-helpers.js";
import {
  COURSE_ID,
  CUSTOMER_ID,
  PAYMENT_ID,
  GRANTED_ENROLLMENT_ID,
  paidAt,
  revokedAt,
  suspendedAt,
  makeCheckout,
} from "@/payments/test/unit/fulfillment.service/fulfillment.service.fixtures.js";

describe("FulfillmentService", () => {
  let service: FulfillmentService;
  let paymentsRepository: MockMethods<
    PaymentsRepository,
    | "recordProcessedEvent"
    | "findPaymentForFulfillment"
    | "markPaymentSucceeded"
  >;
  let enrollmentsRepository: MockMethods<
    EnrollmentsRepository,
    "findEnrollment" | "grantAccess"
  >;
  let emailOutbox: MockMethods<EmailOutboxRepository, "enqueue">;
  let paymentRefunds: MockMethods<PaymentRefunds, "refund">;
  let fake: ReturnType<typeof fakePrisma>;
  // the scope the service passes to repositories inside its transaction
  let tx: ReturnType<typeof fakePrisma>["tx"];
  // whether each repository call ran inside the transaction
  let inTransaction: boolean;
  let callsOutsideTransaction: string[];

  // a mock resolving to `result` that notes whether it ran in the transaction
  function tracked<Fn extends (...args: never[]) => Promise<unknown>>(
    name: string,
    result: Awaited<ReturnType<Fn>>,
  ) {
    return vi.fn<Fn>((() => {
      if (!inTransaction) {
        callsOutsideTransaction.push(name);
      }

      return Promise.resolve(result);
    }) as Fn);
  }

  beforeEach(() => {
    inTransaction = false;
    callsOutsideTransaction = [];

    paymentsRepository = {
      recordProcessedEvent: tracked<PaymentsRepository["recordProcessedEvent"]>(
        "recordProcessedEvent",
        true,
      ),
      findPaymentForFulfillment: tracked<
        PaymentsRepository["findPaymentForFulfillment"]
      >("findPaymentForFulfillment", {
        id: PAYMENT_ID,
        courseId: COURSE_ID,
        customer: { id: CUSTOMER_ID, email: "ada@example.com" },
      }),
      markPaymentSucceeded: tracked<PaymentsRepository["markPaymentSucceeded"]>(
        "markPaymentSucceeded",
        true,
      ),
    };
    enrollmentsRepository = {
      findEnrollment: tracked<EnrollmentsRepository["findEnrollment"]>(
        "findEnrollment",
        null,
      ),
      grantAccess: tracked<EnrollmentsRepository["grantAccess"]>(
        "grantAccess",
        GRANTED_ENROLLMENT_ID,
      ),
    };
    emailOutbox = {
      enqueue: tracked<EmailOutboxRepository["enqueue"]>("enqueue", undefined),
    };
    paymentRefunds = {
      refund: tracked<PaymentRefunds["refund"]>("refund", undefined),
    };

    fake = fakePrisma({
      onBegin: () => {
        inTransaction = true;
      },
      onSettle: () => {
        inTransaction = false;
      },
    });
    tx = fake.tx;

    service = new FulfillmentService(
      fake.prisma,
      asDependency<PaymentsRepository>(paymentsRepository),
      asDependency<EnrollmentsRepository>(enrollmentsRepository),
      asDependency<EmailOutboxRepository>(emailOutbox),
      asDependency<PaymentRefunds>(paymentRefunds),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const emailIds = { courseId: COURSE_ID, customerId: CUSTOMER_ID };

  function expectNothingFulfilled() {
    expect(paymentsRepository.markPaymentSucceeded).not.toHaveBeenCalled();
    expect(enrollmentsRepository.grantAccess).not.toHaveBeenCalled();
    expect(emailOutbox.enqueue).not.toHaveBeenCalled();
    expect(paymentRefunds.refund).not.toHaveBeenCalled();
  }

  describe("events it doesn't fulfill", () => {
    it("stops at an event it has already processed", async () => {
      paymentsRepository.recordProcessedEvent.mockResolvedValue(false);

      await service.fulfillCheckout(makeCheckout());
      expect(
        paymentsRepository.findPaymentForFulfillment,
      ).not.toHaveBeenCalled();
      expectNothingFulfilled();
    });

    it("records the event under the provider's event id", async () => {
      const checkout = makeCheckout();

      await service.fulfillCheckout(checkout);

      expect(paymentsRepository.recordProcessedEvent).toHaveBeenCalledWith(
        tx,
        checkout.event,
      );
    });

    it("ignores a checkout completed without payment", async () => {
      await service.fulfillCheckout(makeCheckout({ providerPayment: null }));

      expectNothingFulfilled();
    });

    it("ignores a checkout without our payment id", async () => {
      await service.fulfillCheckout(makeCheckout({ paymentId: null }));

      expect(
        paymentsRepository.findPaymentForFulfillment,
      ).not.toHaveBeenCalled();
      expectNothingFulfilled();
    });

    it("ignores a payment id that isn't a uuid, without querying it", async () => {
      await service.fulfillCheckout(makeCheckout({ paymentId: "order-42" }));

      expect(
        paymentsRepository.findPaymentForFulfillment,
      ).not.toHaveBeenCalled();
      expectNothingFulfilled();
    });

    it("ignores a payment we don't know", async () => {
      paymentsRepository.findPaymentForFulfillment.mockResolvedValue(null);

      await service.fulfillCheckout(makeCheckout());
      expectNothingFulfilled();
    });

    it("stops when the payment was already moved out of pending", async () => {
      paymentsRepository.markPaymentSucceeded.mockResolvedValue(false);

      await service.fulfillCheckout(makeCheckout());
      expect(enrollmentsRepository.findEnrollment).not.toHaveBeenCalled();
      expect(enrollmentsRepository.grantAccess).not.toHaveBeenCalled();
      expect(emailOutbox.enqueue).not.toHaveBeenCalled();
    });
  });

  describe.each([
    { access: "none", enrollment: null },
    {
      access: "revoked",
      enrollment: { id: "enrollment-1", revokedAt, suspendedAt: null },
    },
  ])("with $access access", ({ enrollment }) => {
    beforeEach(() => {
      enrollmentsRepository.findEnrollment.mockResolvedValue(enrollment);
    });

    it("grants access bought at the payment time and emails the buyer", async () => {
      await service.fulfillCheckout(makeCheckout());
      expect(enrollmentsRepository.findEnrollment).toHaveBeenCalledWith(
        tx,
        COURSE_ID,
        CUSTOMER_ID,
      );
      expect(enrollmentsRepository.grantAccess).toHaveBeenCalledWith(tx, {
        courseId: COURSE_ID,
        customerId: CUSTOMER_ID,
        paymentId: PAYMENT_ID,
        now: paidAt,
      });
      expect(emailOutbox.enqueue).toHaveBeenCalledWith(tx, {
        kind: "access_granted",
        recipient: "ada@example.com",
        payload: emailIds,
        enrollmentId: GRANTED_ENROLLMENT_ID,
      });
    });

    it("emails nothing when a concurrent payment granted access first", async () => {
      enrollmentsRepository.grantAccess.mockResolvedValue(null);

      await service.fulfillCheckout(makeCheckout());
      expect(emailOutbox.enqueue).not.toHaveBeenCalled();
    });
  });

  describe("with suspended access", () => {
    beforeEach(() => {
      enrollmentsRepository.findEnrollment.mockResolvedValue({
        id: "enrollment-1",
        revokedAt: null,
        suspendedAt,
      });
    });

    it("emails about the suspension and the refund without granting access", async () => {
      await service.fulfillCheckout(makeCheckout());
      expect(enrollmentsRepository.grantAccess).not.toHaveBeenCalled();
      expect(emailOutbox.enqueue).toHaveBeenCalledWith(tx, {
        kind: "access_suspended",
        recipient: "ada@example.com",
        payload: { ...emailIds, refundIssued: true },
        enrollmentId: "enrollment-1",
      });
    });

    it("refunds this payment after the transaction has committed", async () => {
      await service.fulfillCheckout(makeCheckout());

      expect(paymentRefunds.refund).toHaveBeenCalledExactlyOnceWith({
        paymentId: PAYMENT_ID,
        providerPaymentId: "pi_test_1",
        cause: "suspended_access",
      });
      expect(callsOutsideTransaction).toEqual(["refund"]);
    });

    it("still resolves, and logs, when the refund fails", async () => {
      const errorSpy = vi
        .spyOn(Logger.prototype, "error")
        .mockImplementation(() => {});
      paymentRefunds.refund.mockRejectedValue(new Error("stripe down"));

      await expect(
        service.fulfillCheckout(makeCheckout()),
      ).resolves.toBeUndefined();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("suspended_access"),
        expect.stringContaining("stripe down"),
      );
    });
  });
});
