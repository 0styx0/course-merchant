import { describe, expect, it } from "vitest";

import { parseAllowedCurrencies } from "./allowed-currencies.js";

describe("parseAllowedCurrencies", () => {
  it("parses a single currency", () => {
    expect([...parseAllowedCurrencies("USD")]).toEqual(["USD"]);
  });

  it("parses a comma-separated list, ignoring spaces", () => {
    expect([...parseAllowedCurrencies("USD, CAD")]).toEqual(["USD", "CAD"]);
  });

  it.each(["", " , "])("rejects an empty list (%j)", (value) => {
    expect(() => parseAllowedCurrencies(value)).toThrow(
      "ALLOWED_CURRENCIES must list at least one currency.",
    );
  });

  it("names every unknown code", () => {
    expect(() => parseAllowedCurrencies("USD,usd,ZZZ")).toThrow(
      "ALLOWED_CURRENCIES contains unknown currency codes: usd, ZZZ.",
    );
  });
});
