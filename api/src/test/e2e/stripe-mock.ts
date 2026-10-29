import type { TestingModuleBuilder } from "@nestjs/testing";
import Stripe from "stripe";

import { STRIPE_CLIENT } from "@/payments/stripe/stripe.service.js";

/**
 * A Stripe client that talks to stripe-mock. Only its address differs from
 * production: StripeService, the SDK and real HTTP all still run.
 */
function stripeClientAt(url: URL): Stripe {
  return new Stripe(process.env["STRIPE_SECRET_KEY"]!, {
    host: url.hostname,
    port: Number(url.port),
    protocol: url.protocol === "https:" ? "https" : "http",
  });
}

export function useStripeMock(
  builder: TestingModuleBuilder,
): TestingModuleBuilder {
  return builder
    .overrideProvider(STRIPE_CLIENT)
    .useValue(stripeClientAt(new URL(process.env["STRIPE_MOCK_URL"]!)));
}

/** Points the app at a port nothing listens on, so every Stripe call fails to connect. */
export function useUnreachableStripe(
  builder: TestingModuleBuilder,
): TestingModuleBuilder {
  return builder
    .overrideProvider(STRIPE_CLIENT)
    .useValue(stripeClientAt(new URL("http://127.0.0.1:1")));
}
