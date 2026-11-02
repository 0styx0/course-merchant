import { describe, expect, it } from "vitest";

import { toCents, toDollarText } from "./dollar-amount";

describe("toDollarText", () => {
  it.each([
    [7950, "79.50"],
    [0, "0.00"],
    [5, "0.05"],
    [10000, "100.00"],
  ])("reads %i cents as %s", (cents, text) => {
    expect(toDollarText(cents)).toBe(text);
  });

  it.each([7950, 0, 5, 199])(
    "converts %i cents back to the same cents",
    (cents) => {
      expect(toCents(toDollarText(cents))).toBe(cents);
    },
  );
});

describe("toCents", () => {
  it("reads a comma as the decimal mark", () => {
    expect(toCents("79,50")).toBe(7950);
  });
});
