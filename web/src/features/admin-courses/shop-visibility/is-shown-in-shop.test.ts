import { describe, expect, it } from "vitest";

import { isShownInShop } from "./is-shown-in-shop";

describe("isShownInShop", () => {
  it.each([
    ["published", 1, true],
    ["published", 2, true],
    ["published", 0, false],
    ["drafted", 1, false],
    ["archived", 1, false],
    ["deleted", 1, false],
  ] as const)(
    "%s with %i prices in effect gives %s",
    (status, count, isShown) => {
      expect(isShownInShop(status, count)).toBe(isShown);
    },
  );
});
