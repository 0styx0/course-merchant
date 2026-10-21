import { describe, expect, it } from "vitest";

import { loadPaymentsConfig } from "./payments-config.js";

const validEnv = {
  STRIPE_SECRET_KEY: "rk_test_abc123",
  WEB_BASE_URL: "https://courses.example.com",
};

describe("loadPaymentsConfig", () => {
  it("reads the Stripe key and site URL", () => {
    expect(loadPaymentsConfig(validEnv)).toEqual({
      stripeSecretKey: "rk_test_abc123",
      webBaseUrl: "https://courses.example.com",
    });
  });

  it("drops a trailing slash from the site URL", () => {
    expect(
      loadPaymentsConfig({ ...validEnv, WEB_BASE_URL: "https://courses.example.com/" })
        .webBaseUrl,
    ).toBe("https://courses.example.com");
  });

  it.each(["sk_test_abc", "sk_live_abc", "rk_live_abc"])("accepts the key %s", (key) => {
    expect(() =>
      loadPaymentsConfig({ ...validEnv, STRIPE_SECRET_KEY: key }),
    ).not.toThrow();
  });

  it("rejects a publishable key without echoing it", () => {
    expect(() =>
      loadPaymentsConfig({ ...validEnv, STRIPE_SECRET_KEY: "pk_live_secret" }),
    ).toThrow(
      /^Invalid payment configuration: STRIPE_SECRET_KEY must be a Stripe secret or restricted key\.$/,
    );
  });

  it("names every missing variable", () => {
    expect(() => loadPaymentsConfig({})).toThrow(/STRIPE_SECRET_KEY.*; WEB_BASE_URL/);
  });
});
