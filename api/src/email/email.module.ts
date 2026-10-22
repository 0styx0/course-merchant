import { Module } from "@nestjs/common";

import { EMAIL_CONFIG, loadEmailConfig } from "@/config/email-config.js";
import { emailTransportProvider, EmailSender } from "./email-sender.js";
import { EmailOutboxRepository } from "./email-outbox.repository.js";

@Module({
  providers: [
    // read once at startup, so a missing setting stops the app immediately
    { provide: EMAIL_CONFIG, useFactory: () => loadEmailConfig() },
    emailTransportProvider,
    EmailSender,
    EmailOutboxRepository,
  ],
  exports: [EMAIL_CONFIG, EmailSender, EmailOutboxRepository],
})
export class EmailModule {}
