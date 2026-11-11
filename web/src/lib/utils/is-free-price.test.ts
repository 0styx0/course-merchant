import { describe, expect, it } from "vitest";
import { isFreePrice } from "./is-free-price";

describe("isFreePrice", () => {
  it("is free at 0", () => {
    expect(isFreePrice(0)).toBe(true);
  });

  it("is not free at 1 cent", () => {
    expect(isFreePrice(1)).toBe(false);
  });
});
