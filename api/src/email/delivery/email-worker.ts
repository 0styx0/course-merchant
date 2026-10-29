import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { Interval } from "@nestjs/schedule";

import { DatabaseClock } from "@/prisma/database-clock.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import { EmailComposer } from "../email-composer.js";
import {
  EmailOutboxRepository,
  type OutboxEmail,
} from "../outbox/email-outbox.repository.js";
import { EmailSender } from "./email-sender.js";

// how often the worker looks for due emails, and how many it takes per look
const POLL_INTERVAL_MS = 10_000;
const BATCH_SIZE = 20;

/**
 * Sends the emails queued in the outbox. Every few seconds it takes the due
 * emails, oldest first, and sends them one at a time, settling each as sent or
 * as a failed attempt (which schedules the retry). It claims each email before
 * sending, so several running copies of the API never send the same one.
 * Every time it reads or writes comes from the database clock, the same one
 * that stamps a queued email, so the copies agree on when an email is due.
 */
@Injectable()
export class EmailWorker implements OnApplicationShutdown {
  private readonly logger = new Logger(EmailWorker.name);
  private currentRun: Promise<void> | null = null;
  private isStopping = false;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EmailOutboxRepository)
    private readonly outbox: EmailOutboxRepository,
    @Inject(EmailComposer)
    private readonly composer: EmailComposer,
    @Inject(EmailSender)
    private readonly sender: EmailSender,
    @Inject(DatabaseClock)
    private readonly clock: DatabaseClock,
  ) {}

  /** Skips the run when the previous one hasn't finished or we're stopping. */
  @Interval(POLL_INTERVAL_MS)
  async runIfIdle(): Promise<void> {
    if (this.currentRun || this.isStopping) {
      return;
    }

    this.currentRun = this.runSafely();

    try {
      await this.currentRun;
    } finally {
      this.currentRun = null;
    }
  }

  /** Starts no new run and waits for the current one to finish. */
  async onApplicationShutdown(): Promise<void> {
    this.isStopping = true;

    await this.currentRun;
  }

  private async runSafely(): Promise<void> {
    try {
      await this.sendDueEmails();
    } catch (error) {
      // e.g. the database is down; the next run tries again
      this.logger.error("Couldn't read the email outbox", error);
    }
  }

  async sendDueEmails(): Promise<void> {
    const dueEmails = await this.outbox.findDue(
      this.prisma.db,
      await this.clock.now(this.prisma.db),
      BATCH_SIZE,
    );

    for (const email of dueEmails) {
      if (this.isStopping) {
        return;
      }

      await this.sendOne(email);
    }
  }

  private async sendOne(email: OutboxEmail): Promise<void> {
    const isClaimed = await this.outbox.claim(
      this.prisma.db,
      email,
      await this.clock.now(this.prisma.db),
    );

    if (!isClaimed) {
      return;
    }

    try {
      const rendered = await this.composer.compose(email);

      await this.sender.send(email.recipient, rendered);
    } catch (error) {
      await this.outbox.markFailedAttempt(
        this.prisma.db,
        email,
        error instanceof Error ? error.message : String(error),
        await this.clock.now(this.prisma.db),
      );

      return;
    }

    await this.outbox.markSent(
      this.prisma.db,
      email.id,
      await this.clock.now(this.prisma.db),
    );
  }
}
