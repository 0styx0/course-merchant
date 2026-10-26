import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAuthGuard } from "@/auth/admin-auth.guard.js";
import { AdminSessionsService } from "@/auth/admin-sessions.service.js";
import { Public } from "@/auth/public.decorator.js";
import { createSessionToken } from "@/auth/session-token.js";
import { ApiException } from "@/common/errors/api.exception.js";
import { asDependency, type MockMethods } from "@/test/test-helpers.js";

class ProtectedController {
  protectedHandler(this: void) {}

  @Public()
  publicHandler(this: void) {}
}

const session = { sessionId: "session-1", adminId: "admin-1" };

function contextFor(handler: () => void, headers: Record<string, string> = {}) {
  const request: { headers: Record<string, string>; adminSession?: unknown } = {
    headers,
  };
  const context = {
    getHandler: () => handler,
    getClass: () => ProtectedController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { context, request };
}

describe("AdminAuthGuard", () => {
  let sessions: MockMethods<AdminSessionsService, "findActiveSession">;
  let guard: AdminAuthGuard;

  const protectedHandler = ProtectedController.prototype.protectedHandler;
  const publicHandler = ProtectedController.prototype.publicHandler;

  beforeEach(() => {
    sessions = {
      findActiveSession: vi
        .fn<AdminSessionsService["findActiveSession"]>()
        .mockResolvedValue(session),
    };
    guard = new AdminAuthGuard(
      new Reflector(),
      asDependency<AdminSessionsService>(sessions),
    );
  });

  async function rejection(promise: Promise<boolean>) {
    const error: unknown = await promise.catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);

    return error as ApiException;
  }

  it("lets a @Public handler through without looking at the request", async () => {
    const { context } = contextFor(publicHandler);

    expect(await guard.canActivate(context)).toBe(true);
    expect(sessions.findActiveSession).not.toHaveBeenCalled();
  });

  it("puts the session on the request for a valid token", async () => {
    const token = createSessionToken();
    const { context, request } = contextFor(protectedHandler, {
      authorization: `Bearer ${token}`,
    });

    expect(await guard.canActivate(context)).toBe(true);
    expect(sessions.findActiveSession).toHaveBeenCalledWith(token);
    expect(request.adminSession).toEqual(session);
  });

  it("accepts the scheme in any case", async () => {
    const { context } = contextFor(protectedHandler, {
      authorization: `bEaReR ${createSessionToken()}`,
    });

    expect(await guard.canActivate(context)).toBe(true);
  });

  it.each([
    ["missing", {}],
    ["another scheme", { authorization: `Basic ${createSessionToken()}` }],
    ["malformed", { authorization: "Bearer not-a-token" }],
    ["no token", { authorization: "Bearer " }],
  ])("refuses a %s header without a database query", async (_name, headers) => {
    const { context } = contextFor(protectedHandler, headers);

    const error = await rejection(guard.canActivate(context));

    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.headers).toEqual({ "WWW-Authenticate": "Bearer" });
    expect(sessions.findActiveSession).not.toHaveBeenCalled();
  });

  it("refuses a token with no active session", async () => {
    sessions.findActiveSession.mockResolvedValue(null);
    const { context, request } = contextFor(protectedHandler, {
      authorization: `Bearer ${createSessionToken()}`,
    });

    const error = await rejection(guard.canActivate(context));

    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.headers).toEqual({ "WWW-Authenticate": "Bearer" });
    expect(request.adminSession).toBeUndefined();
  });
});
