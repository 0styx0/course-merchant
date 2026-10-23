import { Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";

import type { PrismaService } from "./prisma.service.js";

/** Where the clock is read: `prisma.db`, or an open transaction's `tx`. */
export type ClockScope = Pick<PrismaService["db"], "raw" | "query">;

/**
 * Reads the time from Postgres. Use it for any time compared against a column
 * Postgres fills in with `DEFAULT now()`: both sides then come from one clock,
 * at the same microsecond precision, however many API servers are running.
 * (`Temporal.Now` only has milliseconds and is each server's own clock.)
 */
@Injectable()
export class DatabaseClock {
  async now(scope: ClockScope): Promise<Temporal.Instant> {
    const [row] = await scope.query(
      scope.raw.sql`SELECT now() AS "now"`
        .returnsRow({ now: "pg/timestamptz-temporal@1" })
        .build(),
    );

    return row.now;
  }
}
