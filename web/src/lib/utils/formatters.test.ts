import { describe, expect, it } from "vitest";

import { formatPrice } from "./formatters";

describe("formatPrice", () => {
  it.each([
    [9900, "$99"],
    [100, "$1"],
    [4950, "$49.50"],
    [50, "$0.50"],
    [0, "Free"],
  ])("writes %i USD cents as %s", (amount, expected) => {
    expect(formatPrice(amount, "USD")).toBe(expected);
  });

  it("keeps the symbol of another currency", () => {
    expect(formatPrice(9900, "EUR")).toBe("€99");
  });
});
