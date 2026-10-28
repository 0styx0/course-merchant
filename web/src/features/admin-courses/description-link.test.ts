import { describe, expect, it } from "vitest";

import { isAllowedDescriptionLink } from "./description-link";

describe("isAllowedDescriptionLink", () => {
  it.each([
    "https://example.com",
    "http://example.com/a?b=1#c",
    "mailto:a@example.com",
    "tel:+15551234567",
  ])("accepts %s", (href) => {
    expect(isAllowedDescriptionLink(href)).toBe(true);
  });

  it.each([
    "example.com",
    "/page",
    "ftp://example.com",
    "sms:+15551234567",
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    `https://example.com/${"a".repeat(2048)}`,
  ])("refuses %s", (href) => {
    expect(isAllowedDescriptionLink(href)).toBe(false);
  });
});
