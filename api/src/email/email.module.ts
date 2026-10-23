import { Module } from "@nestjs/common";

import { PrismaModule } from "@/prisma/prisma.module.js";
import { EMAIL_CONFIG, loadEmailConfig } from "@/config/email-config.js";
import { emailTransportProvider, EmailSender } from "./email-sender.js";
import { EmailComposer } from "./email-composer.js";
import { EmailOutboxRepository } from "./email-outbox.repository.js";
import { EmailViewsRepository } from "./email-views.repository.js";
import { EmailWorker } from "./email-worker.js";

@Module({
  imports: [PrismaModule],
  providers: [
    // read once at startup, so a missing setting stops the app immediately
    { provide: EMAIL_CONFIG, useFactory: () => loadEmailConfig() },
    emailTransportProvider,
    EmailSender,
    EmailOutboxRepository,
    EmailViewsRepository,
    EmailComposer,
    EmailWorker,
  ],
  exports: [EMAIL_CONFIG, EmailSender, EmailOutboxRepository],
})
export class EmailModule {}
