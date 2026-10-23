import { Inject, Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { Temporal } from "@js-temporal/polyfill";

import { PrismaService } from "@/prisma/prisma.service.js";
import { EmailComposer } from "./email-composer.js";
import {
  EmailOutboxRepository,
  type OutboxEmail,
} from "./email-outbox.repository.js";
import { EmailSender } from "./email-sender.js";

// how often the worker looks for due emails, and how many it takes per look
const POLL_INTERVAL_MS = 10_000;
const BATCH_SIZE = 20;

/**
 * Sends the emails queued in the outbox. Every few seconds it takes the due
 * emails, oldest first, and sends them one at a time, settling each as sent or
 * as a failed attempt (which schedules the retry).
 */
@Injectable()
export class EmailWorker {
  private readonly logger = new Logger(EmailWorker.name);
  private isRunning = false;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EmailOutboxRepository)
    private readonly outbox: EmailOutboxRepository,
    @Inject(EmailComposer)
    private readonly composer: EmailComposer,
    @Inject(EmailSender)
    private readonly sender: EmailSender,
  ) {}

  /** Skips the run when the previous one hasn't finished. */
  @Interval(POLL_INTERVAL_MS)
  async runIfIdle(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      await this.sendDueEmails();
    } catch (error) {
      // e.g. the database is down; the next run tries again
      this.logger.error("Couldn't read the email outbox", error);
    } finally {
      this.isRunning = false;
    }
  }

  async sendDueEmails(): Promise<void> {
    const dueEmails = await this.outbox.findDue(
      this.prisma.db,
      Temporal.Now.instant(),
      BATCH_SIZE,
    );

    for (const email of dueEmails) {
      await this.sendOne(email);
    }
  }

  private async sendOne(email: OutboxEmail): Promise<void> {
    try {
      const rendered = await this.composer.compose(email);

      await this.sender.send(email.recipient, rendered);
    } catch (error) {
      await this.outbox.markFailedAttempt(
        this.prisma.db,
        email,
        error instanceof Error ? error.message : String(error),
        Temporal.Now.instant(),
      );

      return;
    }

    await this.outbox.markSent(
      this.prisma.db,
      email.id,
      Temporal.Now.instant(),
    );
  }
}
