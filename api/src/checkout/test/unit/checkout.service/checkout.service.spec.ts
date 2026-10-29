import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CheckoutDecisionService,
  CheckoutNextStep,
  type CheckoutDecision,
} from "@/checkout/checkout-decision.service.js";
import { CheckoutRepository } from "@/checkout/checkout.repository.js";
import { CheckoutService } from "@/checkout/checkout.service.js";
import { StripeRedirectService } from "@/checkout/stripe-redirect.service.js";
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
  request,
  makeCourse,
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
});
