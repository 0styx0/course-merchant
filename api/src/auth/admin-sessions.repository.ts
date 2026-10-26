import { Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";
import { and } from "@prisma/orm-postgres/orm-client";

import type { Models } from "@/prisma/contract.js";
import type { DbScope } from "types.js";
import type { ActiveSessionCutoffs } from "./session-lifetime.js";

export type AdminSession = Omit<Models.public_AdminSession, "admin">;

@Injectable()
export class AdminSessionsRepository {
  async create(
    scope: DbScope,
    session: { adminId: string; tokenHash: string },
  ): Promise<AdminSession> {
    return scope.orm.public.AdminSession.create(session);
  }

  /** The session for this token, unless it is too old or has sat idle. */
  async findActive(
    scope: DbScope,
    tokenHash: string,
    cutoffs: ActiveSessionCutoffs,
  ): Promise<AdminSession | null> {
    return scope.orm.public.AdminSession.where((session) =>
      and(
        session.tokenHash.eq(tokenHash),
        session.createdAt.gt(cutoffs.createdAfter),
        session.updatedAt.gt(cutoffs.usedAfter),
      ),
    ).first();
  }

  /**
   * Records that the session was just used, unless it was refreshed after
   * `staleBefore`. The condition is part of the `UPDATE` itself, so parallel
   * requests write once. Returns whether this call wrote.
   */
  async touch(
    scope: DbScope,
    sessionId: string,
    now: Temporal.Instant,
    staleBefore: Temporal.Instant,
  ): Promise<boolean> {
    const touched = await scope.orm.public.AdminSession.where((session) =>
      and(session.id.eq(sessionId), session.updatedAt.lt(staleBefore)),
    ).updateAndCount({ updatedAt: now });

    return touched === 1;
  }

  async delete(scope: DbScope, sessionId: string): Promise<void> {
    await scope.orm.public.AdminSession.where((session) =>
      session.id.eq(sessionId),
    ).deleteAndCount();
  }

  async deleteAllForAdmin(scope: DbScope, adminId: string): Promise<void> {
    await scope.orm.public.AdminSession.where((session) =>
      session.adminId.eq(adminId),
    ).deleteAndCount();
  }
}
