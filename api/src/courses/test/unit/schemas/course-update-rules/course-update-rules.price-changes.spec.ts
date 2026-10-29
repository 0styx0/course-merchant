import { describe, expect, it } from "vitest";
import { findPriceChanges } from "@/courses/validation/course-update-rules.js";
import {
  now,
  at,
  makeStored,
  makeRequest,
} from "@/courses/test/unit/schemas/course-update-rules/course-update-rules.fixtures.js";

describe("findPriceChanges", () => {
  it("changes nothing for an unchanged round-trip", () => {
    const stored = makeStored();

    expect(
      findPriceChanges({ request: makeRequest(stored), stored, now }),
    ).toEqual({ newPrices: [], deletePriceIds: [] });
  });

  it("replaces an edited future price", () => {
    const stored = makeStored();
    const request = makeRequest(stored);

    request.prices[1].amount = 9000;

    expect(findPriceChanges({ request, stored, now })).toEqual({
      newPrices: [request.prices[1]],
      deletePriceIds: ["price_future"],
    });
  });

  it("deletes omitted future prices but keeps prices in effect", () => {
    const stored = makeStored();

    expect(
      findPriceChanges({
        request: { ...makeRequest(stored), prices: [] },
        stored,
        now,
      }),
    ).toEqual({ newPrices: [], deletePriceIds: ["price_future"] });
  });

  it("inserts new prices", () => {
    const stored = makeStored();
    const request = makeRequest(stored);
    const newPrice = {
      amount: 9900,
      currency: "USD",
      effectiveAt: at(36).toString(),
    };

    request.prices.push(newPrice);

    expect(findPriceChanges({ request, stored, now })).toEqual({
      newPrices: [newPrice],
      deletePriceIds: [],
    });
  });
});
