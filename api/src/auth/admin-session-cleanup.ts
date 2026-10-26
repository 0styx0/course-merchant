import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { Temporal } from "@js-temporal/polyfill";

import { PrismaService } from "@/prisma/prisma.service.js";
import { AdminLoginAttemptsRepository } from "./admin-login-attempts.repository.js";
import { AdminSessionsRepository } from "./admin-sessions.repository.js";
import { attemptWindowStart } from "./attempt-window.js";
import { activeSessionCutoffs } from "./session-lifetime.js";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Deletes the admin sessions that can no longer log in and the login attempts
 * too old to count. Nothing reads these rows, so this only keeps the tables
 * small. Every API server runs it; deleting rows twice is harmless. Times come
 * from the server clock, like the guard's (see docs/auth.md).
 */
@Injectable()
export class AdminSessionCleanup implements OnApplicationShutdown {
  private readonly logger = new Logger(AdminSessionCleanup.name);
  private currentRun: Promise<void> | null = null;
  private isStopping = false;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AdminSessionsRepository)
    private readonly sessions: AdminSessionsRepository,
    @Inject(AdminLoginAttemptsRepository)
    private readonly attempts: AdminLoginAttemptsRepository,
  ) {}

  /** Skips the run when the previous one hasn't finished or we're stopping. */
  @Interval(CLEANUP_INTERVAL_MS)
  async runIfIdle(): Promise<void> {
    if (this.currentRun || this.isStopping) {
      return;
    }

    this.currentRun = this.cleanup();

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

  async cleanup(): Promise<void> {
    await this.runStep("delete expired sessions", () =>
      this.deleteExpiredSessions(),
    );
    await this.runStep("delete old login attempts", () =>
      this.deleteOldAttempts(),
    );
  }

  private async runStep(
    name: string,
    step: () => Promise<void>,
  ): Promise<void> {
    try {
      await step();
    } catch (error) {
      // e.g. the database is down; the next run tries again
      this.logger.error(
        `Couldn't ${name}`,
        error instanceof Error ? (error.stack ?? error.message) : String(error),
      );
    }
  }

  private async deleteExpiredSessions(): Promise<void> {
    const deleted = await this.sessions.deleteExpired(
      this.prisma.db,
      activeSessionCutoffs(Temporal.Now.instant()),
    );

    if (deleted > 0) {
      this.logger.log(`Deleted ${deleted} expired admin sessions.`);
    }
  }

  private async deleteOldAttempts(): Promise<void> {
    const deleted = await this.attempts.deleteOlderThan(
      this.prisma.db,
      attemptWindowStart(),
    );

    if (deleted > 0) {
      this.logger.log(`Deleted ${deleted} old login attempts.`);
    }
  }
}
