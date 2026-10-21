import { Module } from "@nestjs/common";

import { EmailOutboxRepository } from "./email-outbox.repository.js";

@Module({
  providers: [EmailOutboxRepository],
  exports: [EmailOutboxRepository],
})
export class EmailModule {}
