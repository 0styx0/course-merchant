import { describe, expect, it } from "vitest";
import { errorMessage, errorStack } from "./error-text.js";

describe("errorMessage", () => {
  it("returns the message of an Error", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  it("converts anything else to a string", () => {
    expect(errorMessage("oops")).toBe("oops");
  });
});

describe("errorStack", () => {
  it("returns the stack of an Error", () => {
    const error = new Error("boom");

    expect(errorStack(error)).toBe(error.stack);
  });

  it("falls back to the message when there is no stack", () => {
    const error = new Error("boom");
    error.stack = undefined;

    expect(errorStack(error)).toBe("boom");
  });

  it("converts anything else to a string", () => {
    expect(errorStack(42)).toBe("42");
  });
});
