import { Temporal } from "@js-temporal/polyfill";
import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import {
  completedCheckoutFromEvent,
  expiredCheckoutFromEvent,
  retrievedCheckoutFromSession,
} from "@/payments/stripe/stripe-events.js";

describe("completedCheckoutFromEvent", () => {
  // 2026-10-21T12:00:00Z, in the seconds Stripe uses
  const CREATED = 1792584000;

  // only the fields the mapper reads; the rest of Stripe's event is irrelevant
  function makeEvent(
    session: Partial<Stripe.Checkout.Session> = {},
  ): Stripe.CheckoutSessionCompletedEvent {
    return {
      id: "evt_test_1",
      type: "checkout.session.completed",
      created: CREATED,
      data: {
        object: {
          id: "cs_test_1",
          client_reference_id: "8b0e1f5c-0000-4000-8000-000000000004",
          payment_status: "paid",
          payment_intent: "pi_test_1",
          ...session,
        },
      },
    } as unknown as Stripe.CheckoutSessionCompletedEvent;
  }

  it("reads a paid checkout in our terms", () => {
    expect(completedCheckoutFromEvent(makeEvent())).toEqual({
      event: {
        provider: "stripe",
        eventId: "evt_test_1",
        type: "checkout.session.completed",
      },
      paymentId: "8b0e1f5c-0000-4000-8000-000000000004",
      providerCheckoutId: "cs_test_1",
      providerPayment: {
        id: "pi_test_1",
        paidAt: Temporal.Instant.from("2026-10-21T12:00:00Z"),
      },
    });
  });

  it("reads the payment intent id when it was expanded", () => {
    const event = makeEvent({
      payment_intent: { id: "pi_test_2" } as Stripe.PaymentIntent,
    });

    expect(completedCheckoutFromEvent(event).providerPayment?.id).toBe(
      "pi_test_2",
    );
  });

  it("passes a missing client_reference_id through as null", () => {
    const event = makeEvent({ client_reference_id: null });

    expect(completedCheckoutFromEvent(event).paymentId).toBeNull();
  });

  it("has no payment when the checkout completed unpaid", () => {
    const event = makeEvent({ payment_status: "unpaid", payment_intent: null });

    expect(completedCheckoutFromEvent(event).providerPayment).toBeNull();
  });

  it("throws when Stripe reports a paid checkout without a payment intent", () => {
    const event = makeEvent({ payment_intent: null });

    expect(() => completedCheckoutFromEvent(event)).toThrow(
      "Stripe reported Checkout Session cs_test_1 as paid without a payment intent.",
    );
  });
});

describe("expiredCheckoutFromEvent", () => {
  function makeEvent(
    clientReferenceId: string | null,
  ): Stripe.CheckoutSessionExpiredEvent {
    return {
      id: "evt_test_2",
      type: "checkout.session.expired",
      data: {
        object: { id: "cs_test_1", client_reference_id: clientReferenceId },
      },
    } as unknown as Stripe.CheckoutSessionExpiredEvent;
  }

  it("reads an expired checkout in our terms", () => {
    expect(
      expiredCheckoutFromEvent(
        makeEvent("8b0e1f5c-0000-4000-8000-000000000004"),
      ),
    ).toEqual({
      event: {
        provider: "stripe",
        eventId: "evt_test_2",
        type: "checkout.session.expired",
      },
      paymentId: "8b0e1f5c-0000-4000-8000-000000000004",
    });
  });

  it("passes a missing client_reference_id through as null", () => {
    expect(expiredCheckoutFromEvent(makeEvent(null)).paymentId).toBeNull();
  });
});

describe("retrievedCheckoutFromSession", () => {
  // 2026-10-21T12:00:00Z, in the seconds Stripe uses
  const CHARGED = 1792584000;

  // only the fields the mapper reads; the rest of Stripe's session is irrelevant
  function makeSession(
    session: Partial<Stripe.Checkout.Session> = {},
  ): Stripe.Checkout.Session {
    return {
      id: "cs_test_1",
      status: "complete",
      client_reference_id: "8b0e1f5c-0000-4000-8000-000000000004",
      payment_status: "paid",
      payment_intent: {
        id: "pi_test_1",
        latest_charge: { id: "ch_test_1", created: CHARGED },
      },
      ...session,
    } as unknown as Stripe.Checkout.Session;
  }

  it("reads a completed checkout, paid when the buyer was charged", () => {
    expect(retrievedCheckoutFromSession(makeSession())).toEqual({
      state: "completed",
      completion: {
        paymentId: "8b0e1f5c-0000-4000-8000-000000000004",
        providerCheckoutId: "cs_test_1",
        providerPayment: {
          id: "pi_test_1",
          paidAt: Temporal.Instant.from("2026-10-21T12:00:00Z"),
        },
      },
    });
  });

  it("has no payment when the checkout completed unpaid", () => {
    const retrieved = retrievedCheckoutFromSession(
      makeSession({ payment_status: "unpaid", payment_intent: null }),
    );

    expect(retrieved).toMatchObject({
      state: "completed",
      completion: { providerPayment: null },
    });
  });

  it("reads an expired checkout", () => {
    expect(
      retrievedCheckoutFromSession(makeSession({ status: "expired" })),
    ).toEqual({ state: "expired" });
  });

  it("reads a checkout the buyer can still pay as open", () => {
    expect(
      retrievedCheckoutFromSession(makeSession({ status: "open" })),
    ).toEqual({ state: "open" });
  });

  it("throws when a paid checkout has no charge to take the time from", () => {
    const session = makeSession({
      payment_intent: { id: "pi_test_1", latest_charge: "ch_test_1" } as never,
    });

    expect(() => retrievedCheckoutFromSession(session)).toThrow(
      "Stripe reported Checkout Session cs_test_1 as paid without a charge.",
    );
  });
});
