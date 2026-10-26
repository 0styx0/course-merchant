import { Inject, Injectable } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";

import { EMAIL_CONFIG, type EmailConfig } from "@/email/email-config.js";
import type { RenderedEmail } from "./templates/email-content.js";

// A send must end well inside the outbox's claim on the email (10 minutes), or
// another worker could claim and send it too. Worst case: 30 + 30 + 60 s.
const CONNECTION_TIMEOUT_MS = 30_000;
const GREETING_TIMEOUT_MS = 30_000;
const SOCKET_INACTIVITY_TIMEOUT_MS = 60_000;

export const EMAIL_TRANSPORT = Symbol("EMAIL_TRANSPORT");

export const emailTransportProvider = {
  provide: EMAIL_TRANSPORT,
  inject: [EMAIL_CONFIG],
  // creating the transport doesn't connect; the first send does
  useFactory: (config: EmailConfig) =>
    nodemailer.createTransport({
      url: config.smtpUrl,
      requireTLS: config.requireTls,
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      greetingTimeout: GREETING_TIMEOUT_MS,
      socketTimeout: SOCKET_INACTIVITY_TIMEOUT_MS,
    }),
};

export class EmailDeliveryError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("The email provider didn't accept the email.", options);
    this.name = "EmailDeliveryError";
  }
}

/**
 * The only place the app sends mail. It speaks SMTP, so changing provider is a
 * change to `SMTP_URL`.
 */
@Injectable()
export class EmailSender {
  constructor(
    @Inject(EMAIL_TRANSPORT)
    private readonly transport: Pick<Transporter, "sendMail">,
    @Inject(EMAIL_CONFIG)
    private readonly config: EmailConfig,
  ) {}

  /** Throws `EmailDeliveryError` when the provider doesn't accept the email. */
  async send(recipient: string, email: RenderedEmail): Promise<void> {
    try {
      await this.transport.sendMail({
        from: this.config.from,
        to: recipient,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
    } catch (error) {
      throw new EmailDeliveryError({ cause: error });
    }
  }
}
