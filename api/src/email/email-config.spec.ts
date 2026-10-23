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
      from: "Course Shop <hello@example.com>",
      shopName: "Course Shop",
    });
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
