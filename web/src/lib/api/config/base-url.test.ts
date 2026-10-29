import { describe, expect, it } from "vitest";

import { validateApiBaseUrl } from "./base-url";

describe("validateApiBaseUrl", () => {
  it("accepts https in production", () => {
    expect(validateApiBaseUrl("https://api.example.com", "production")).toBe(
      "https://api.example.com",
    );
  });

  it("rejects plain http to a remote host in production", () => {
    expect(() =>
      validateApiBaseUrl("http://api.example.com", "production"),
    ).toThrow("https://");
  });

  it.each([
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://[::1]:3001",
  ])("accepts %s in production", (value) => {
    expect(validateApiBaseUrl(value, "production")).toBe(value);
  });

  it("accepts plain http outside production", () => {
    expect(validateApiBaseUrl("http://api.example.com", "development")).toBe(
      "http://api.example.com",
    );
  });

  it("rejects a missing or invalid value", () => {
    expect(() => validateApiBaseUrl(undefined, "development")).toThrow(
      "not configured",
    );
    expect(() => validateApiBaseUrl("nope", "development")).toThrow(
      "valid URL",
    );
  });
});
