import { describe, expect, it } from "vitest";

import { isUuid } from "./is-uuid";

describe("isUuid", () => {
  it("accepts a UUID", () => {
    expect(isUuid("3f0c1c1e-8f4e-4c3e-9a57-0d6a4f0b9a11")).toBe(true);
  });

  it.each(["", "not-a-uuid", "3f0c1c1e-8f4e-4c3e-9a57-0d6a4f0b9a1"])(
    "refuses %j",
    (candidate) => {
      expect(isUuid(candidate)).toBe(false);
    },
  );
});
