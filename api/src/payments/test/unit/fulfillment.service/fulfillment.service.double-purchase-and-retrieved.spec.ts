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

  it("marks the payment succeeded with the provider's ids and payment time", async () => {
    await service.fulfillCheckout(makeCheckout());

    expect(paymentsRepository.markPaymentSucceeded).toHaveBeenCalledWith(tx, {
      id: PAYMENT_ID,
      providerCheckoutId: "cs_test_1",
      providerPaymentId: "pi_test_1",
      paidAt,
    });
  });

  describe("with active access (a double purchase)", () => {
    beforeEach(() => {
      enrollmentsRepository.findEnrollment.mockResolvedValue({
        id: "enrollment-1",
        revokedAt: null,
        suspendedAt: null,
      });
    });

    it("emails that the course is owned and a refund is coming", async () => {
      await service.fulfillCheckout(makeCheckout());

      expect(enrollmentsRepository.grantAccess).not.toHaveBeenCalled();
      expect(emailOutbox.enqueue).toHaveBeenCalledWith(tx, {
        kind: "already_owned",
        recipient: "ada@example.com",
        payload: { ...emailIds, refundIssued: true },
        enrollmentId: "enrollment-1",
      });
    });

    it("refunds this payment", async () => {
      await service.fulfillCheckout(makeCheckout());

      expect(paymentRefunds.refund).toHaveBeenCalledTimes(1);
      expect(paymentRefunds.refund).toHaveBeenCalledWith({
        paymentId: PAYMENT_ID,
        providerPaymentId: "pi_test_1",
        cause: "double_purchase",
      });
    });

    it("refunds only after the transaction has committed", async () => {
      await service.fulfillCheckout(makeCheckout());

      expect(fake.db.transaction).toHaveBeenCalledTimes(1);
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
        expect.stringContaining(PAYMENT_ID),
        expect.stringContaining("stripe down"),
      );
    });

    it("doesn't refund when the transaction fails", async () => {
      emailOutbox.enqueue.mockRejectedValue(new Error("outbox unavailable"));

      await expect(service.fulfillCheckout(makeCheckout())).rejects.toThrow(
        "outbox unavailable",
      );
      expect(paymentRefunds.refund).not.toHaveBeenCalled();
    });
  });

  it("makes every change in one transaction", async () => {
    await service.fulfillCheckout(makeCheckout());

    expect(fake.db.transaction).toHaveBeenCalledTimes(1);
    expect(emailOutbox.enqueue).toHaveBeenCalled();
    expect(callsOutsideTransaction).toEqual([]);
  });

  describe("fulfillRetrievedCheckout", () => {
    function makeCompletion() {
      const { paymentId, providerCheckoutId, providerPayment } = makeCheckout();

      return { paymentId, providerCheckoutId, providerPayment };
    }

    it("fulfills the checkout without recording an event", async () => {
      await service.fulfillRetrievedCheckout(makeCompletion());

      expect(paymentsRepository.recordProcessedEvent).not.toHaveBeenCalled();
      expect(paymentsRepository.markPaymentSucceeded).toHaveBeenCalledWith(tx, {
        id: PAYMENT_ID,
        providerCheckoutId: "cs_test_1",
        providerPaymentId: "pi_test_1",
        paidAt,
      });
      expect(emailOutbox.enqueue).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ kind: "access_granted" }),
      );
      expect(callsOutsideTransaction).toEqual([]);
    });

    it("stops when the webhook already fulfilled the payment", async () => {
      paymentsRepository.markPaymentSucceeded.mockResolvedValue(false);

      await service.fulfillRetrievedCheckout(makeCompletion());

      expect(enrollmentsRepository.grantAccess).not.toHaveBeenCalled();
      expect(paymentRefunds.refund).not.toHaveBeenCalled();
    });

    it("refunds a double purchase after the transaction commits", async () => {
      enrollmentsRepository.findEnrollment.mockResolvedValue({
        id: "enrollment-1",
        revokedAt: null,
        suspendedAt: null,
      });

      await service.fulfillRetrievedCheckout(makeCompletion());

      expect(paymentRefunds.refund).toHaveBeenCalledExactlyOnceWith({
        paymentId: PAYMENT_ID,
        providerPaymentId: "pi_test_1",
        cause: "double_purchase",
      });
      expect(callsOutsideTransaction).toEqual(["refund"]);
    });
  });

  it("never refunds an ordinary purchase", async () => {
    await service.fulfillCheckout(makeCheckout());

    expect(paymentRefunds.refund).not.toHaveBeenCalled();
  });
});
