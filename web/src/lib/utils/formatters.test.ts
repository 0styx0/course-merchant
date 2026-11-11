import { describe, expect, it } from "vitest";

import { dateOnlyFormatter, formatPrice } from "./formatters";

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

describe("dateOnlyFormatter", () => {
  const moment = new Date("2030-10-02T02:00:00Z");

  it.each([
    ["en-US", "Oct 1, 2030"],
    ["en-GB", "1 Oct 2030"],
  ])(
    "writes the date in the %s locale and the given zone",
    (locale, expected) => {
      expect(dateOnlyFormatter("America/New_York", locale).format(moment)).toBe(
        expected,
      );
    },
  );
});
