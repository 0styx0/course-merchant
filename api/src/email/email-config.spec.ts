import { describe, expect, it } from "vitest";

import { loadEmailConfig } from "./email-config.js";

const validEnv = {
  SMTP_URL: "smtps://user:secret@smtp.example.com",
  EMAIL_FROM: "Course Shop <hello@example.com>",
  EMAIL_SHOP_NAME: "Course Shop",
};

describe("loadEmailConfig", () => {
  it("reads the SMTP URL, sender and shop name", () => {
    expect(loadEmailConfig(validEnv)).toEqual({
      smtpUrl: "smtps://user:secret@smtp.example.com",
      requireTls: true,
      from: "Course Shop <hello@example.com>",
      shopName: "Course Shop",
    });
  });

  it("rejects an unparsable URL without echoing it", () => {
    const attempt = () =>
      loadEmailConfig({ ...validEnv, SMTP_URL: "smtp://user:p@ss@@[bad" });

    expect(attempt).toThrow(/SMTP_URL must be a valid URL/);
    expect(attempt).not.toThrow(/p@ss/);
  });

  it.each(["smtp://smtp.example.com:587", "smtps://smtp.example.com"])(
    "requires encryption for the remote server %s",
    (smtpUrl) => {
      expect(
        loadEmailConfig({ ...validEnv, SMTP_URL: smtpUrl }).requireTls,
      ).toBe(true);
    },
  );

  it.each([
    "smtp://localhost:1025",
    "smtp://127.0.0.1:1025",
    "smtp://[::1]:1025",
  ])("doesn't require encryption to this machine's %s", (smtpUrl) => {
    expect(loadEmailConfig({ ...validEnv, SMTP_URL: smtpUrl }).requireTls).toBe(
      false,
    );
  });

  it("rejects a missing setting by name", () => {
    expect(() =>
      loadEmailConfig({ ...validEnv, EMAIL_FROM: undefined }),
    ).toThrow(/EMAIL_FROM/);
  });

  it("rejects a non-SMTP URL without echoing it", () => {
    const attempt = () =>
      loadEmailConfig({ ...validEnv, SMTP_URL: "https://secret.example.com" });

    expect(attempt).toThrow(/SMTP_URL/);
    expect(attempt).not.toThrow(/secret/);
  });
});
