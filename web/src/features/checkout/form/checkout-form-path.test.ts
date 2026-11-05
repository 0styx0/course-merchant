import { describe, expect, it } from "vitest";

import { checkoutFormPath } from "./checkout-form-path";

describe("checkoutFormPath", () => {
  it.each([
    ["/customer/name", "customer.name"],
    ["/customer/email", "customer.email"],
  ])("maps %s to %s", (pointer, formPath) => {
    expect(checkoutFormPath(pointer)).toBe(formPath);
  });

  it.each(["/courseId", "/customer", "/customer/phone", ""])(
    "returns nothing for %j",
    (pointer) => {
      expect(checkoutFormPath(pointer)).toBeUndefined();
    },
  );
});
