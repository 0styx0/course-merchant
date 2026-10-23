import { Temporal } from "@js-temporal/polyfill";
import type { PrismaService } from "@/prisma/prisma.service.js";

export const instant = (value: string) => Temporal.Instant.from(value);

export function toDatabasePrecision(value: string): string {
  return Temporal.Instant.from(value)
    .round({ smallestUnit: "microseconds" })
    .toString();
}

/**
 * A stand-in for `PrismaService` in unit tests. `db` is the plain scope and
 * `tx` the scope handed to `transaction` callbacks, so tests can tell which
 * one a service passed to a repository.
 */
export function fakePrisma() {
  const tx = { name: "tx" };
  const db = {
    name: "db",
    transaction: <T>(callback: (scope: typeof tx) => Promise<T>) =>
      callback(tx),
  };

  return { prisma: { db } as unknown as PrismaService, db, tx };
}
