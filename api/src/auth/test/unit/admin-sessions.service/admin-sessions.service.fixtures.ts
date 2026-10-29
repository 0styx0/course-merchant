import { expect } from "vitest";
import { type AdminSession } from "@/auth/admin-sessions.repository.js";
import { ApiException } from "@/common/errors/api.exception.js";
import { instant } from "@/test/test-helpers.js";

export function makeSession(
  overrides: Partial<AdminSession> = {},
): AdminSession {
  return {
    id: "session-1",
    adminId: "admin-1",
    tokenHash: "hash",
    createdAt: instant("2026-10-26T12:00:00Z"),
    updatedAt: instant("2026-10-26T12:00:00Z"),
    ...overrides,
  };
}

export async function failure(
  promise: Promise<unknown>,
): Promise<ApiException> {
  const error: unknown = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );

  expect(error).toBeInstanceOf(ApiException);

  return error as ApiException;
}
