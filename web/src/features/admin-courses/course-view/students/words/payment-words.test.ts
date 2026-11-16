import { describe, expect, it } from "vitest";

import { paymentWords } from "./payment-words";

describe("paymentWords", () => {
  it("reads Paid, green, for a succeeded payment", () => {
    expect(paymentWords("succeeded")).toEqual({
      word: "Paid",
      colourPair: "success",
    });
  });

  it.each([
    ["refunded", "Refunded"],
    ["pending", "Pending"],
    ["expired", "Expired"],
  ] as const)("reads %s as %s, grey", (status, word) => {
    expect(paymentWords(status)).toEqual({ word, colourPair: "muted" });
  });
});
