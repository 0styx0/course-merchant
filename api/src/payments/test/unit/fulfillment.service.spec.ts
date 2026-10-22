import { Temporal } from "@js-temporal/polyfill";
import { Logger } from "@nestjs/common";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";

import { EmailOutboxRepository } from "@/email/email-outbox.repository.js";
import { EnrollmentsRepository } from "@/enrollments/enrollments.repository.js";
import {
  FulfillmentService,
  type CompletedCheckout,
} from "@/payments/fulfillment.service.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import { StripeService } from "@/payments/stripe.service.js";
import { PrismaService } from "@/prisma/prisma.service.js";

const COURSE_ID = "8b0e1f5c-0000-4000-8000-000000000001";
const CUSTOMER_ID = "8b0e1f5c-0000-4000-8000-000000000002";
const PAYMENT_ID = "8b0e1f5c-0000-4000-8000-000000000004";

const paidAt = Temporal.Instant.from("2026-10-21T12:00:00Z");
const revokedAt = Temporal.Instant.from("2026-10-01T00:00:00Z");
const suspendedAt = Temporal.Instant.from("2026-10-02T00:00:00Z");

function makeCheckout(
  overrides: Partial<CompletedCheckout> = {},
): CompletedCheckout {
  return {
    event: {
      provider: "stripe",
      eventId: "evt_test_1",
      type: "checkout.session.completed",
    },
    paymentId: PAYMENT_ID,
    providerCheckoutId: "cs_test_1",
    providerPayment: { id: "pi_test_1", paidAt },
    ...overrides,
  };
}

describe("FulfillmentService", () => {
  const tx = { orm: {} };

  let service: FulfillmentService;
  let paymentsRepository: {
    recordProcessedEvent: Mock<PaymentsRepository["recordProcessedEvent"]>;
    findPaymentForFulfillment: Mock<
      PaymentsRepository["findPaymentForFulfillment"]
    >;
    markPaymentSucceeded: Mock<PaymentsRepository["markPaymentSucceeded"]>;
  };
  let enrollmentsRepository: {
    findEnrollment: Mock<EnrollmentsRepository["findEnrollment"]>;
    grantAccess: Mock<EnrollmentsRepository["grantAccess"]>;
  };
  let emailOutbox: { enqueue: Mock<EmailOutboxRepository["enqueue"]> };
  let stripeService: { refundPayment: Mock<StripeService["refundPayment"]> };
  let prisma: { db: { transaction: ReturnType<typeof vi.fn> } };
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
        true,
      ),
    };
    emailOutbox = {
      enqueue: tracked<EmailOutboxRepository["enqueue"]>("enqueue", undefined),
    };
    stripeService = {
      refundPayment: tracked<StripeService["refundPayment"]>(
        "refundPayment",
        undefined,
      ),
    };

    // runs the callback with a stand-in transaction, as the real one would
    prisma = {
      db: {
        transaction: vi.fn(async (work: (scope: typeof tx) => unknown) => {
          inTransaction = true;

          try {
            return await work(tx);
          } finally {
            inTransaction = false;
          }
        }),
      },
    };

    service = new FulfillmentService(
      prisma as unknown as PrismaService,
      paymentsRepository as unknown as PaymentsRepository,
      enrollmentsRepository,
      emailOutbox as unknown as EmailOutboxRepository,
      stripeService as unknown as StripeService,
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
    expect(stripeService.refundPayment).not.toHaveBeenCalled();
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

  it("marks the payment succeeded with the provider's ids and payment time", async () => {
    await service.fulfillCheckout(makeCheckout());

    expect(paymentsRepository.markPaymentSucceeded).toHaveBeenCalledWith(tx, {
      id: PAYMENT_ID,
      providerCheckoutId: "cs_test_1",
      providerPaymentId: "pi_test_1",
      paidAt,
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
      });
    });

    it("emails nothing when a concurrent payment granted access first", async () => {
      enrollmentsRepository.grantAccess.mockResolvedValue(false);

      await service.fulfillCheckout(makeCheckout());
      expect(emailOutbox.enqueue).not.toHaveBeenCalled();
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
      });
    });

    it("refunds this payment", async () => {
      await service.fulfillCheckout(makeCheckout());

      expect(stripeService.refundPayment).toHaveBeenCalledTimes(1);
      expect(stripeService.refundPayment).toHaveBeenCalledWith({
        paymentId: PAYMENT_ID,
        providerPaymentId: "pi_test_1",
      });
    });

    it("refunds only after the transaction has committed", async () => {
      await service.fulfillCheckout(makeCheckout());

      expect(prisma.db.transaction).toHaveBeenCalledTimes(1);
      expect(callsOutsideTransaction).toEqual(["refundPayment"]);
    });

    it("still resolves, and logs, when the refund fails", async () => {
      const errorSpy = vi
        .spyOn(Logger.prototype, "error")
        .mockImplementation(() => {});
      stripeService.refundPayment.mockRejectedValue(new Error("stripe down"));

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
      expect(stripeService.refundPayment).not.toHaveBeenCalled();
    });
  });

  describe("with suspended access", () => {
    it("emails about the suspension without granting access", async () => {
      enrollmentsRepository.findEnrollment.mockResolvedValue({
        id: "enrollment-1",
        revokedAt: null,
        suspendedAt,
      });

      await service.fulfillCheckout(makeCheckout());
      expect(enrollmentsRepository.grantAccess).not.toHaveBeenCalled();
      expect(emailOutbox.enqueue).toHaveBeenCalledWith(tx, {
        kind: "access_suspended",
        recipient: "ada@example.com",
        payload: emailIds,
      });
    });
  });

  it("makes every change in one transaction", async () => {
    await service.fulfillCheckout(makeCheckout());

    expect(prisma.db.transaction).toHaveBeenCalledTimes(1);
    expect(emailOutbox.enqueue).toHaveBeenCalled();
    expect(callsOutsideTransaction).toEqual([]);
  });

  it("never calls the provider for an ordinary purchase", async () => {
    await service.fulfillCheckout(makeCheckout());

    expect(stripeService.refundPayment).not.toHaveBeenCalled();
  });
});
