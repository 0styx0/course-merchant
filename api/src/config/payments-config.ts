import 'dotenv/config.js';
import { z } from "zod";

const paymentsEnvSchema = z.object({
  // prefer a restricted key (rk_) that can only create and read Checkout
  // Sessions and create refunds
  STRIPE_SECRET_KEY: z
    .string()
    .regex(/^(sk|rk)_(test|live)_/, "must be a Stripe secret or restricted key"),
  // proves a webhook request really came from Stripe. Each webhook endpoint
  // (and each `stripe listen` session) has its own
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .regex(/^whsec_/, "must be a Stripe webhook signing secret"),
  // the public site buyers return to after paying
  WEB_BASE_URL: z.url({ protocol: /^https?$/ }),
});

export type PaymentsConfig = {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  webBaseUrl: string;
};

export const PAYMENTS_CONFIG = Symbol("PAYMENTS_CONFIG");

/**
 * Reads the payment settings from the environment. Throws on startup when one
 * is missing or malformed, naming the variable but never echoing its value.
 */
export function loadPaymentsConfig(
  env: Record<string, string | undefined> = process.env,
): PaymentsConfig {
  const result = paymentsEnvSchema.safeParse(env);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")} ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid payment configuration: ${problems}.`);
  }

  return {
    stripeSecretKey: result.data.STRIPE_SECRET_KEY,
    stripeWebhookSecret: result.data.STRIPE_WEBHOOK_SECRET,
    webBaseUrl: result.data.WEB_BASE_URL.replace(/\/$/, ""),
  };
}
