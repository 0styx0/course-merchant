import { describe, expect, it } from "vitest";

import { readRequestLocale } from "./request-locale";

describe("readRequestLocale", () => {
  it("returns the one language the header names", () => {
    expect(readRequestLocale("en-GB")).toBe("en-GB");
  });

  it("returns the first language listed, since browsers list their favourite first", () => {
    expect(readRequestLocale("de;q=0.5, fr;q=0.9")).toBe("de");
  });

  it("skips the * wildcard", () => {
    expect(readRequestLocale("*, fr;q=0.2")).toBe("fr");
  });

  it("skips a tag that is not a valid language tag", () => {
    expect(readRequestLocale("en_US!!, fr;q=0.2")).toBe("fr");
  });

  it("drops a -u- extension so a calendar choice cannot change the year", () => {
    expect(readRequestLocale("th-TH-u-ca-buddhist")).toBe("th-TH");
  });

  it.each([[null], [""], ["*"], ["en_US!!"]])(
    "falls back to en-US for %j",
    (header) => {
      expect(readRequestLocale(header)).toBe("en-US");
    },
  );
});
