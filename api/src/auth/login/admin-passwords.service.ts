import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "@/prisma/prisma.service.js";
import { AdminLoginAttemptsRepository } from "./admin-login-attempts.repository.js";
import { AdminSessionsRepository } from "../sessions/admin-sessions.repository.js";
import {
  AdminsRepository,
  type SetPasswordOutcome,
} from "../admins.repository.js";
import { hashPassword } from "./password-hashing.js";

/** What the `admin:set-password` command does, apart from asking for input. */
@Injectable()
export class AdminPasswordsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AdminsRepository)
    private readonly admins: AdminsRepository,
    @Inject(AdminSessionsRepository)
    private readonly sessions: AdminSessionsRepository,
    @Inject(AdminLoginAttemptsRepository)
    private readonly attempts: AdminLoginAttemptsRepository,
  ) {}

  /**
   * Creates the admin or replaces their password. A new password signs the
   * admin out everywhere and lifts a lockout, in the same transaction.
   */
  async setPassword(
    email: string,
    password: string,
  ): Promise<SetPasswordOutcome> {
    const passwordHash = await hashPassword(password);

    return this.prisma.db.transaction(async (tx) => {
      const { outcome, adminId } = await this.admins.setPassword(
        tx,
        email,
        passwordHash,
      );
      await this.sessions.deleteAllForAdmin(tx, adminId);
      await this.attempts.deleteAllForEmail(tx, email);

      return outcome;
    });
  }
}
