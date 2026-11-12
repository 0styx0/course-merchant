import { describe, expect, it } from "vitest";

import { getCheckoutStatusTitle } from "./checkout-status-title";

describe("getCheckoutStatusTitle", () => {
  it.each([
    ["expired", "Checkout timed out"],
    ["refunded", "Payment refunded"],
    ["pending", "Thank you"],
    ["succeeded", "Thank you"],
  ] as const)("names the %s status %s", (status, title) => {
    expect(getCheckoutStatusTitle(status)).toBe(title);
  });
});
