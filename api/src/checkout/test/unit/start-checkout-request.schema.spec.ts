import { describe, expect, it } from "vitest";

import { startCheckoutRequestSchema } from "@/checkout/validation/start-checkout-request.schema.js";

const valid = {
  courseId: "8b0e1f5c-0000-4000-8000-000000000001",
  customer: { name: "Ada Lovelace", email: "ada@example.com" },
};

function withCustomer(customer: object) {
  return { ...valid, customer: { ...valid.customer, ...customer } };
}

describe("startCheckoutRequestSchema", () => {
  it("trims the customer's name and lowercases their email", () => {
    expect(
      startCheckoutRequestSchema.parse(
        withCustomer({ name: "  Ada Lovelace ", email: " Ada@Example.COM " }),
      ),
    ).toEqual(valid);
  });

  it.each([
    ["an empty customer name", withCustomer({ name: "   " })],
    ["a customer name over 100 characters", withCustomer({ name: "a".repeat(101) })],
    ["a malformed email", withCustomer({ email: "ada.example.com" })],
    ["an email over 254 characters", withCustomer({ email: `${"a".repeat(250)}@x.io` })],
    ["an unknown customer field", withCustomer({ phone: "555-0100" })],
    ["a missing customer", { courseId: valid.courseId }],
    ["a malformed course id", { ...valid, courseId: "123" }],
    ["an unknown top-level field", { ...valid, amount: 0 }],
  ])("rejects %s", (_label, input) => {
    expect(startCheckoutRequestSchema.safeParse(input).success).toBe(false);
  });
});
