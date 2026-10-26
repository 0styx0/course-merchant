import { Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";
import { and } from "@prisma/orm-postgres/orm-client";

import type { DbScope } from "types.js";

@Injectable()
export class AdminLoginAttemptsRepository {
  /** `email` must already be normalized by `emailSchema`. */
  async record(scope: DbScope, email: string): Promise<void> {
    await scope.orm.public.AdminLoginAttempt.create({ email });
  }

  /** Tries for this email, this one included, since `since`. */
  async countSince(
    scope: DbScope,
    email: string,
    since: Temporal.Instant,
  ): Promise<number> {
    const { attempts } = await scope.orm.public.AdminLoginAttempt.where(
      (attempt) => and(attempt.email.eq(email), attempt.createdAt.gt(since)),
    ).aggregate((aggregate) => ({ attempts: aggregate.count() }));

    return attempts;
  }

  async deleteAllForEmail(scope: DbScope, email: string): Promise<void> {
    await scope.orm.public.AdminLoginAttempt.where((attempt) =>
      attempt.email.eq(email),
    ).deleteAndCount();
  }
}
