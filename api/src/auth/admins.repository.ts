import { Injectable } from "@nestjs/common";

import type { DbScope } from "types.js";

export type SetPasswordOutcome = "created" | "updated";

@Injectable()
export class AdminsRepository {
  /**
   * Creates the admin, or replaces the password of the one with this email
   * (already normalized by `emailSchema`).
   */
  async setPassword(
    scope: DbScope,
    email: string,
    passwordHash: string,
  ): Promise<SetPasswordOutcome> {
    // skips the insert, instead of failing, when the email already has an
    // admin. `upsert` can't say which of the two happened
    const insertedAdmins = await scope.orm.public.Admin.createAndCount(
      [{ id: crypto.randomUUID(), email, passwordHash }],
      { onConflict: "skip", conflictOn: ["email"] },
    );

    if (insertedAdmins === 1) {
      return "created";
    }

    await scope.orm.public.Admin.where((admin) =>
      admin.email.eq(email),
    ).updateAndCount({ passwordHash });

    return "updated";
  }
}
