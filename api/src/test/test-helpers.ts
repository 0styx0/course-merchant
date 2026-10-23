import { Temporal } from "@js-temporal/polyfill";
import { vi, type Mock } from "vitest";

import type { PrismaService } from "@/prisma/prisma.service.js";

export const instant = (value: string) => Temporal.Instant.from(value);

export function toDatabasePrecision(value: string): string {
  return Temporal.Instant.from(value)
    .round({ smallestUnit: "microseconds" })
    .toString();
}

// vitest doesn't export its `Procedure` type; this is `Mock`'s default
type Procedure = Mock extends Mock<infer P> ? P : never;

type MethodNames<T> = {
  [K in keyof T & string]: T[K] extends Procedure ? K : never;
}[keyof T & string];

/** Typed vitest mocks for the methods `K` of the class `T`. */
export type MockMethods<T, K extends MethodNames<T>> = {
  [M in K]: T[M] extends Procedure ? Mock<T[M]> : never;
};

/**
 * Hands mocks to a constructor that expects the real class. It is the one cast
 * unit tests need: the mocks hold only the methods a test uses, so a call to
 * any other method fails with "is not a function". Naming a method the class
 * doesn't have is a type error.
 */
export function asDependency<T>(
  mocks: Partial<Record<MethodNames<T>, unknown>>,
): T {
  return mocks as unknown as T;
}

type TransactionHooks = {
  /** Runs when a transaction callback starts. */
  onBegin?: () => void;
  /** Runs when it finishes without throwing, after the callback returned. */
  onCommit?: () => void;
  /** Runs when it finishes, whether it committed or threw. */
  onSettle?: () => void;
};

/**
 * A stand-in for `PrismaService` in unit tests. `db` is the plain scope and
 * `tx` the scope handed to `transaction` callbacks, so tests can tell which
 * one a service passed to a repository. The hooks let a test record when
 * transactions begin and end relative to other calls.
 */
export function fakePrisma(hooks: TransactionHooks = {}) {
  const tx = { name: "tx" };
  const db = {
    name: "db",
    transaction: vi.fn(
      async <T>(callback: (scope: typeof tx) => Promise<T>) => {
        hooks.onBegin?.();

        try {
          const result = await callback(tx);
          hooks.onCommit?.();

          return result;
        } finally {
          hooks.onSettle?.();
        }
      },
    ),
  };

  return { prisma: { db } as unknown as PrismaService, db, tx };
}
