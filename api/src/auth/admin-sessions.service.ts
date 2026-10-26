import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";

import type { AdminSessionResponse, CreateAdminSessionRequest } from "types.js";
import { ApiException } from "@/common/errors/api.exception.js";
import { ErrorCodeAuth } from "@/common/errors/error-codes.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import { AdminLoginAttemptsRepository } from "./admin-login-attempts.repository.js";
import { AdminSessionsRepository } from "./admin-sessions.repository.js";
import { AdminsRepository, type Admin } from "./admins.repository.js";
import { HashingSlots } from "./hashing-slots.js";
import { getDummyHash, verifyPassword } from "./password-hashing.js";
import { createSessionToken, hashSessionToken } from "./session-token.js";
import {
  absoluteExpiresAt,
  activeSessionCutoffs,
  touchCutoff,
} from "./session-lifetime.js";

// an email may try this many times in this window, counting the current try
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MINUTES = 15;

export interface CurrentAdminSession {
  sessionId: string;
  adminId: string;
}

/** The same answer for an unknown email and a wrong password. */
function invalidCredentials() {
  return new ApiException(ErrorCodeAuth.INVALID_CREDENTIALS, {
    detail: "The email or password is wrong.",
    headers: { "WWW-Authenticate": "Bearer" },
  });
}

@Injectable()
export class AdminSessionsService implements OnModuleInit {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AdminsRepository)
    private readonly admins: AdminsRepository,
    @Inject(AdminSessionsRepository)
    private readonly sessions: AdminSessionsRepository,
    @Inject(AdminLoginAttemptsRepository)
    private readonly attempts: AdminLoginAttemptsRepository,
    @Inject(HashingSlots)
    private readonly hashingSlots: HashingSlots,
  ) {}

  /** So the first login for an unknown email isn't faster than the rest. */
  async onModuleInit(): Promise<void> {
    await getDummyHash();
  }

  /**
   * Checks the password and starts a session. The token comes back once; only
   * its hash is kept.
   */
  async logIn(
    request: CreateAdminSessionRequest,
  ): Promise<AdminSessionResponse> {
    const releaseSlot = this.takeHashingSlot();

    try {
      await this.recordAttemptWithinLimit(request.email);
      const admin = await this.verifyCredentials(request);

      return await this.startSession(admin);
    } finally {
      releaseSlot();
    }
  }

  /** The session this token belongs to, or null when it is not valid. */
  async findActiveSession(token: string): Promise<CurrentAdminSession | null> {
    const now = Temporal.Now.instant();
    const session = await this.sessions.findActive(
      this.prisma.db,
      hashSessionToken(token),
      activeSessionCutoffs(now),
    );

    if (!session) {
      return null;
    }

    const staleBefore = touchCutoff(now);

    if (Temporal.Instant.compare(session.updatedAt, staleBefore) < 0) {
      await this.sessions.touch(this.prisma.db, session.id, now, staleBefore);
    }

    return { sessionId: session.id, adminId: session.adminId };
  }

  async logOut(sessionId: string): Promise<void> {
    await this.sessions.delete(this.prisma.db, sessionId);
  }

  /** Refused before the attempt is saved, so a flood can't fill the table. */
  private takeHashingSlot(): () => void {
    const release = this.hashingSlots.tryAcquire();

    if (!release) {
      throw new ApiException(ErrorCodeAuth.TOO_MANY_LOGIN_ATTEMPTS, {
        detail: "The server is busy. Try again in a moment.",
        headers: { "Retry-After": "1" },
      });
    }

    return release;
  }

  /**
   * Commits the attempt on its own, then counts: parallel requests each see
   * every row committed so far, so they can't all pass. Inside one
   * transaction each would see only its own row.
   */
  private async recordAttemptWithinLimit(email: string): Promise<void> {
    await this.attempts.record(this.prisma.db, email);

    const attempts = await this.attempts.countSince(
      this.prisma.db,
      email,
      Temporal.Now.instant().subtract({ minutes: ATTEMPT_WINDOW_MINUTES }),
    );

    if (attempts > MAX_ATTEMPTS) {
      throw new ApiException(ErrorCodeAuth.TOO_MANY_LOGIN_ATTEMPTS, {
        detail: `Try again in ${ATTEMPT_WINDOW_MINUTES} minutes.`,
        headers: { "Retry-After": String(ATTEMPT_WINDOW_MINUTES * 60) },
      });
    }
  }

  /** Hashes against a dummy for an unknown email, so both take as long. */
  private async verifyCredentials(
    request: CreateAdminSessionRequest,
  ): Promise<Admin> {
    const admin = await this.admins.findByEmail(this.prisma.db, request.email);
    const passwordHash = admin?.passwordHash ?? (await getDummyHash());
    const passwordMatches = await verifyPassword(
      passwordHash,
      request.password,
    );

    if (!admin || !passwordMatches) {
      throw invalidCredentials();
    }

    return admin;
  }

  private async startSession(admin: Admin): Promise<AdminSessionResponse> {
    const token = createSessionToken();

    const session = await this.prisma.db.transaction(async (tx) => {
      const created = await this.sessions.create(tx, {
        adminId: admin.id,
        tokenHash: hashSessionToken(token),
      });
      await this.attempts.deleteAllForEmail(tx, admin.email);

      return created;
    });

    return {
      token,
      absoluteExpiresAt: absoluteExpiresAt(session.createdAt).toString(),
    };
  }
}
