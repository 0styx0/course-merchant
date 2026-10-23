import { describe, expect, it } from "vitest";

import { loadPaymentsConfig } from "./payments-config.js";

const validEnv = {
  STRIPE_SECRET_KEY: "rk_test_abc123",
  STRIPE_WEBHOOK_SECRET: "whsec_abc123",
  WEB_BASE_URL: "https://courses.example.com",
};

describe("loadPaymentsConfig", () => {
  it("reads the Stripe key, webhook secret and site URL", () => {
    expect(loadPaymentsConfig(validEnv)).toEqual({
      stripeSecretKey: "rk_test_abc123",
      stripeWebhookSecret: "whsec_abc123",
      webBaseUrl: "https://courses.example.com",
    });
  });

  it("drops a trailing slash from the site URL", () => {
    expect(
      loadPaymentsConfig({
        ...validEnv,
        WEB_BASE_URL: "https://courses.example.com/",
      }).webBaseUrl,
    ).toBe("https://courses.example.com");
  });

  it.each(["sk_test_abc", "sk_live_abc", "rk_live_abc"])(
    "accepts the key %s",
    (key) => {
      expect(() =>
        loadPaymentsConfig({ ...validEnv, STRIPE_SECRET_KEY: key }),
      ).not.toThrow();
    },
  );

  it("rejects a publishable key without echoing it", () => {
    expect(() =>
      loadPaymentsConfig({ ...validEnv, STRIPE_SECRET_KEY: "pk_live_secret" }),
    ).toThrow(
      /^Invalid payment configuration: STRIPE_SECRET_KEY must be a Stripe secret or restricted key\.$/,
    );
  });

  it("rejects a webhook secret that isn't one", () => {
    expect(() =>
      loadPaymentsConfig({ ...validEnv, STRIPE_WEBHOOK_SECRET: "sk_test_abc" }),
    ).toThrow(
      /^Invalid payment configuration: STRIPE_WEBHOOK_SECRET must be a Stripe webhook signing secret\.$/,
    );
  });

  it("names every missing variable", () => {
    expect(() => loadPaymentsConfig({})).toThrow(
      /STRIPE_SECRET_KEY.*; STRIPE_WEBHOOK_SECRET.*; WEB_BASE_URL/,
    );
  });
});
