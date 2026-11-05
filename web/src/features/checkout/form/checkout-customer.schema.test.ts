import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { findCheckoutCustomerErrors } from "./checkout-customer.schema";
import {
  CHECKOUT_EMAIL_INCOMPLETE_MESSAGE,
  CHECKOUT_EMAIL_TOO_LONG_MESSAGE,
  CHECKOUT_NAME_MISSING_MESSAGE,
  CHECKOUT_NAME_TOO_LONG_MESSAGE,
} from "./checkout-messages";

const emailError = {
  path: "customer.email",
  message: CHECKOUT_EMAIL_INCOMPLETE_MESSAGE,
};
const nameError = {
  path: "customer.name",
  message: CHECKOUT_NAME_MISSING_MESSAGE,
};

describe("findCheckoutCustomerErrors", () => {
  it("finds no error in a valid pair", () => {
    expect(
      findCheckoutCustomerErrors({
        name: "Ami Cohen",
        email: "ami@example.com",
      }),
    ).toEqual([]);
  });

  it("words an email without a domain as incomplete", () => {
    expect(
      findCheckoutCustomerErrors({ name: "Ami Cohen", email: "ami@" }),
    ).toEqual([emailError]);
  });

  it("words an empty email as incomplete", () => {
    expect(
      findCheckoutCustomerErrors({ name: "Ami Cohen", email: "" }),
    ).toEqual([emailError]);
  });

  it("asks for a name when the name is empty", () => {
    expect(
      findCheckoutCustomerErrors({ name: "", email: "ami@example.com" }),
    ).toEqual([nameError]);
  });

  it("asks for a name when the name is only spaces", () => {
    expect(
      findCheckoutCustomerErrors({ name: "   ", email: "ami@example.com" }),
    ).toEqual([nameError]);
  });

  it("accepts a name of exactly 100 characters", () => {
    expect(
      findCheckoutCustomerErrors({
        name: "a".repeat(100),
        email: "ami@example.com",
      }),
    ).toEqual([]);
  });

  it("words a name of 101 characters as too long", () => {
    expect(
      findCheckoutCustomerErrors({
        name: "a".repeat(101),
        email: "ami@example.com",
      }),
    ).toEqual([
      { path: "customer.name", message: CHECKOUT_NAME_TOO_LONG_MESSAGE },
    ]);
  });

  it("counts a name's length after trimming", () => {
    expect(
      findCheckoutCustomerErrors({
        name: ` ${"a".repeat(100)} `,
        email: "ami@example.com",
      }),
    ).toEqual([]);
  });

  it("accepts an email of exactly 254 characters", () => {
    const email = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(58)}.co`;
    expect(email).toHaveLength(254);
    expect(findCheckoutCustomerErrors({ name: "Ami", email })).toEqual([]);
  });

  it("words an email of 255 characters as too long", () => {
    const email = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(59)}.co`;
    expect(email).toHaveLength(255);
    expect(findCheckoutCustomerErrors({ name: "Ami", email })).toEqual([
      { path: "customer.email", message: CHECKOUT_EMAIL_TOO_LONG_MESSAGE },
    ]);
  });

  it("words a long email without a domain as too long", () => {
    expect(
      findCheckoutCustomerErrors({ name: "Ami", email: "a".repeat(255) }),
    ).toEqual([
      { path: "customer.email", message: CHECKOUT_EMAIL_TOO_LONG_MESSAGE },
    ]);
  });

  it("lists the name error before the email error", () => {
    expect(findCheckoutCustomerErrors({ name: "", email: "ami@" })).toEqual([
      nameError,
      emailError,
    ]);
  });
});

describe("the browser's words", () => {
  const apiFiles = [
    "../api/src/checkout/validation/start-checkout-request.schema.ts",
    "../api/src/common/validation/email.schema.ts",
  ]
    .map((path) => readFileSync(resolve(path), "utf8"))
    .join("\n");

  it("match the API's name sentence", () => {
    expect(apiFiles).toContain(CHECKOUT_NAME_MISSING_MESSAGE);
  });

  it("match the API's too-long name sentence", () => {
    expect(apiFiles).toContain(CHECKOUT_NAME_TOO_LONG_MESSAGE);
  });

  it("match the API's too-long email sentence", () => {
    expect(apiFiles).toContain(CHECKOUT_EMAIL_TOO_LONG_MESSAGE);
  });

  it("match the API's email sentence", () => {
    expect(apiFiles).toContain(CHECKOUT_EMAIL_INCOMPLETE_MESSAGE);
  });
});
