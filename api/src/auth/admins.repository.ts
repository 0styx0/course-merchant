import { Injectable } from "@nestjs/common";

import type { Models } from "@/prisma/contract.js";
import type { DbScope } from "types.js";

export type Admin = Omit<Models.public_Admin, "sessions">;

export type SetPasswordOutcome = "created" | "updated";

@Injectable()
export class AdminsRepository {
  /** `email` must already be normalized by `emailSchema`. */
  async findByEmail(scope: DbScope, email: string): Promise<Admin | null> {
    return scope.orm.public.Admin.where((admin) =>
      admin.email.eq(email),
    ).first();
  }

  /**
   * Creates the admin, or replaces the password of the one with this email
   * (already normalized by `emailSchema`).
   */
  async setPassword(
    scope: DbScope,
    email: string,
    passwordHash: string,
  ): Promise<{ outcome: SetPasswordOutcome; adminId: string }> {
    const newId = crypto.randomUUID();

    // skips the insert, instead of failing, when the email already has an
    // admin. `upsert` can't say which of the two happened
    const insertedAdmins = await scope.orm.public.Admin.createAndCount(
      [{ id: newId, email, passwordHash }],
      { onConflict: "skip", conflictOn: ["email"] },
    );

    if (insertedAdmins === 1) {
      return { outcome: "created", adminId: newId };
    }

    // unconditional write, so `update` (which returns the row) is fine here
    const admin = await scope.orm.public.Admin.where((candidate) =>
      candidate.email.eq(email),
    ).update({ passwordHash });

    if (!admin) {
      throw new Error("The admin disappeared while its password was set.");
    }

    return { outcome: "updated", adminId: admin.id };
  }
}
