import { describe, expect, it, vi } from "vitest";

import {
  EmailDeliveryError,
  EmailSender,
} from "@/email/delivery/email-sender.js";

const config = {
  smtpUrl: "smtp://localhost",
  requireTls: false,
  from: "Course Shop <hello@example.com>",
  shopName: "Course Shop",
};
const email = { subject: "Hi", text: "text", html: "<p>html</p>" };

describe("EmailSender", () => {
  it("sends both parts from the configured sender", async () => {
    const sendMail = vi.fn().mockResolvedValue({});

    await new EmailSender({ sendMail }, config).send("ann@example.com", email);

    expect(sendMail).toHaveBeenCalledWith({
      from: config.from,
      to: "ann@example.com",
      ...email,
    });
  });

  it("wraps a provider failure in EmailDeliveryError", async () => {
    const cause = new Error("connection refused");
    const sender = new EmailSender(
      { sendMail: vi.fn().mockRejectedValue(cause) },
      config,
    );

    const error: unknown = await sender
      .send("ann@example.com", email)
      .catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect((error as EmailDeliveryError).cause).toBe(cause);
  });
});
