import { Temporal } from "@js-temporal/polyfill";
import Stripe from "stripe";
import { vi } from "vitest";

import type { PaymentsConfig } from "@/payments/payments-config.js";
import {
  createStripeClient,
  StripeService,
  type CreateCheckoutSessionInput,
} from "@/payments/stripe/stripe.service.js";

export const config: PaymentsConfig = {
  stripeSecretKey: "sk_test_unit",
  stripeWebhookSecret: "whsec_unit_test_secret",
  webBaseUrl: "https://courses.example.com",
};

export type StripeRequest = {
  url: string;
  headers: Headers;
  body: URLSearchParams;
};

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// a real Stripe client whose HTTP calls go to `respond` instead of the network
export function serviceWith(
  respond: (request: StripeRequest) => Response | Promise<Response>,
) {
  const requests: StripeRequest[] = [];

  const fetchFn = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      const request = {
        url: url instanceof Request ? url.url : url.toString(),
        headers: new Headers(init?.headers),
        body: new URLSearchParams(init?.body as string | undefined),
      };

      requests.push(request);

      return respond(request);
    },
  );

  const stripe = createStripeClient("sk_test_unit", {
    httpClient: Stripe.createFetchHttpClient(fetchFn),
    maxNetworkRetries: 0,
  });

  return { service: new StripeService(stripe, config), requests, stripe };
}

export function makeInput(): CreateCheckoutSessionInput {
  return {
    paymentId: "9f1c2d3e-0000-4000-8000-000000000001",
    amount: 9900,
    currency: "USD",
    courseName: "React Fundamentals",
    customerEmail: "ada@example.com",
    successUrl: "https://courses.example.com/checkout/success",
    cancelUrl: "https://courses.example.com/courses/123",
    expiresAt: Temporal.Instant.from("2026-10-21T17:30:00Z"),
  };
}

export const createdSession = {
  id: "cs_test_123",
  object: "checkout.session",
  url: "https://checkout.stripe.com/c/pay/cs_test_123",
};
