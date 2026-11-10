import { describe, expect, it, vi } from "vitest";

import { validateContactEmail } from "./contact-email";

async function freshContactEmail() {
  vi.resetModules();
  const { contactEmail } = await import("./contact-email");
  return contactEmail;
}

describe("validateContactEmail", () => {
  it("returns a valid address", () => {
    expect(validateContactEmail("shop@example.com")).toBe("shop@example.com");
  });

  it("rejects a missing setting", () => {
    expect(() => validateContactEmail(undefined)).toThrow(
      "CONTACT_EMAIL is not configured",
    );
  });

  it("rejects an empty setting", () => {
    expect(() => validateContactEmail("")).toThrow(
      "CONTACT_EMAIL is not configured",
    );
  });

  it("rejects an invalid address", () => {
    expect(() => validateContactEmail("nope")).toThrow(
      "CONTACT_EMAIL is not a valid email address",
    );
  });

  it("rejects an address with surrounding spaces", () => {
    expect(() => validateContactEmail(" shop@example.com ")).toThrow(
      "CONTACT_EMAIL is not a valid email address",
    );
  });
});

describe("contactEmail", () => {
  it("returns the configured address", async () => {
    vi.stubEnv("CONTACT_EMAIL", "shop@example.com");
    const contactEmail = await freshContactEmail();

    expect(contactEmail()).toBe("shop@example.com");
  });

  it("remembers the address it read first", async () => {
    vi.stubEnv("CONTACT_EMAIL", "first@example.com");
    const contactEmail = await freshContactEmail();
    contactEmail();

    vi.stubEnv("CONTACT_EMAIL", "second@example.com");

    expect(contactEmail()).toBe("first@example.com");
  });
});
