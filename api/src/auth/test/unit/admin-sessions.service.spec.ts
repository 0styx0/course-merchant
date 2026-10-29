import { Temporal } from "@js-temporal/polyfill";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { AdminLoginAttemptsRepository } from "@/auth/admin-login-attempts.repository.js";
import {
  AdminSessionsRepository,
  type AdminSession,
} from "@/auth/admin-sessions.repository.js";
import { AdminSessionsService } from "@/auth/admin-sessions.service.js";
import { AdminsRepository, type Admin } from "@/auth/admins.repository.js";
import { HashingSlots } from "@/auth/hashing-slots.js";
import { hashPassword } from "@/auth/password-hashing.js";
import { isWellFormedSessionToken } from "@/auth/session-token.js";
import { ApiException } from "@/common/errors/api.exception.js";
import {
  ADMIN_EMAIL as EMAIL,
  ADMIN_PASSWORD as PASSWORD,
} from "@/test/admin-fixtures.js";
import {
  asDependency,
  fakePrisma,
  instant,
  type MockMethods,
} from "@/test/test-helpers.js";

function makeSession(overrides: Partial<AdminSession> = {}): AdminSession {
  return {
    id: "session-1",
    adminId: "admin-1",
    tokenHash: "hash",
    createdAt: instant("2026-10-26T12:00:00Z"),
    updatedAt: instant("2026-10-26T12:00:00Z"),
    ...overrides,
  };
}

async function failure(promise: Promise<unknown>): Promise<ApiException> {
  const error: unknown = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );

  expect(error).toBeInstanceOf(ApiException);

  return error as ApiException;
}

describe("AdminSessionsService", () => {
  let admin: Admin;

  beforeAll(async () => {
    admin = {
      id: "admin-1",
      email: EMAIL,
      passwordHash: await hashPassword(PASSWORD),
      createdAt: instant("2026-10-01T00:00:00Z"),
      updatedAt: new Date(),
    };
  });

  let calls: string[];
  let slots: HashingSlots;
  let admins: MockMethods<AdminsRepository, "findByEmail">;
  let sessions: MockMethods<
    AdminSessionsRepository,
    "create" | "findActive" | "touch" | "delete"
  >;
  let attempts: MockMethods<
    AdminLoginAttemptsRepository,
    "record" | "countSince" | "deleteAllForEmail"
  >;
  let service: AdminSessionsService;
  let fake: ReturnType<typeof fakePrisma>;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    calls = [];
    slots = new HashingSlots(2);
    fake = fakePrisma({
      onBegin: () => calls.push("begin"),
      onCommit: () => calls.push("commit"),
    });

    admins = {
      findByEmail: vi
        .fn<AdminsRepository["findByEmail"]>()
        .mockResolvedValue(admin),
    };
    sessions = {
      create: vi
        .fn<AdminSessionsRepository["create"]>()
        .mockImplementation(() => {
          calls.push("create session");
          return Promise.resolve(makeSession());
        }),
      findActive: vi
        .fn<AdminSessionsRepository["findActive"]>()
        .mockResolvedValue(makeSession()),
      touch: vi.fn<AdminSessionsRepository["touch"]>().mockResolvedValue(true),
      delete: vi.fn<AdminSessionsRepository["delete"]>().mockResolvedValue(),
    };
    attempts = {
      record: vi
        .fn<AdminLoginAttemptsRepository["record"]>()
        .mockImplementation(() => {
          calls.push("record attempt");
          return Promise.resolve();
        }),
      countSince: vi
        .fn<AdminLoginAttemptsRepository["countSince"]>()
        .mockImplementation(() => {
          calls.push("count attempts");
          return Promise.resolve(1);
        }),
      deleteAllForEmail: vi
        .fn<AdminLoginAttemptsRepository["deleteAllForEmail"]>()
        .mockImplementation(() => {
          calls.push("clear attempts");
          return Promise.resolve();
        }),
    };

    service = new AdminSessionsService(
      fake.prisma,
      asDependency<AdminsRepository>(admins),
      asDependency<AdminSessionsRepository>(sessions),
      asDependency<AdminLoginAttemptsRepository>(attempts),
      slots,
    );
  });

  describe("logIn", () => {
    it("starts a session and returns the token once", async () => {
      const response = await service.logIn({
        email: EMAIL,
        password: PASSWORD,
      });

      expect(isWellFormedSessionToken(response.token)).toBe(true);
      expect(response.absoluteExpiresAt).toBe("2026-11-02T12:00:00Z");
      expect(sessions.create).toHaveBeenCalledWith(fake.tx, {
        adminId: "admin-1",
        tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      });
    });

    it("commits the attempt on its own before counting, then creates the session and clears the attempts in one transaction", async () => {
      await service.logIn({ email: EMAIL, password: PASSWORD });

      expect(attempts.record).toHaveBeenCalledWith(fake.db, EMAIL);
      expect(calls).toEqual([
        "record attempt",
        "count attempts",
        "begin",
        "create session",
        "clear attempts",
        "commit",
      ]);
      expect(attempts.deleteAllForEmail).toHaveBeenCalledWith(fake.tx, EMAIL);
    });

    it("refuses the 6th attempt in the window, with Retry-After", async () => {
      attempts.countSince.mockResolvedValue(6);

      const error = await failure(
        service.logIn({ email: EMAIL, password: PASSWORD }),
      );

      expect(error.code).toBe("TOO_MANY_LOGIN_ATTEMPTS");
      expect(error.headers).toEqual({ "Retry-After": "900" });
      expect(admins.findByEmail).not.toHaveBeenCalled();
    });

    it("allows the 5th attempt", async () => {
      attempts.countSince.mockResolvedValue(5);

      await expect(
        service.logIn({ email: EMAIL, password: PASSWORD }),
      ).resolves.toBeDefined();
    });

    it("counts only the last 15 minutes", async () => {
      const now = instant("2026-10-26T12:00:00Z");
      vi.spyOn(Temporal.Now, "instant").mockReturnValue(now);

      await service.logIn({ email: EMAIL, password: PASSWORD });

      expect(attempts.countSince).toHaveBeenCalledWith(
        fake.db,
        EMAIL,
        now.subtract({ minutes: 15 }),
      );
    });

    it("answers a wrong password and an unknown email the same way", async () => {
      const wrongPassword = await failure(
        service.logIn({ email: EMAIL, password: "not the password at all" }),
      );
      admins.findByEmail.mockResolvedValue(null);
      const unknownEmail = await failure(
        service.logIn({ email: "nobody@example.com", password: PASSWORD }),
      );

      for (const error of [wrongPassword, unknownEmail]) {
        expect(error.code).toBe("INVALID_CREDENTIALS");
        expect(error.headers).toEqual({ "WWW-Authenticate": "Bearer" });
        expect(error.detail).toBe("The email or password is wrong.");
      }
      expect(sessions.create).not.toHaveBeenCalled();
    });

    it("saves the attempt of a failed login and does not clear it", async () => {
      admins.findByEmail.mockResolvedValue(null);

      await failure(service.logIn({ email: EMAIL, password: PASSWORD }));

      expect(attempts.record).toHaveBeenCalledOnce();
      expect(attempts.deleteAllForEmail).not.toHaveBeenCalled();
    });

    it("refuses before saving an attempt when every hashing slot is taken", async () => {
      slots.tryAcquire();
      slots.tryAcquire();

      const error = await failure(
        service.logIn({ email: EMAIL, password: PASSWORD }),
      );

      expect(error.code).toBe("TOO_MANY_LOGIN_ATTEMPTS");
      expect(error.headers).toEqual({ "Retry-After": "1" });
      expect(attempts.record).not.toHaveBeenCalled();
    });

    it("frees its slot on every outcome", async () => {
      const oneSlot = new HashingSlots(1);
      service = new AdminSessionsService(
        fake.prisma,
        asDependency<AdminsRepository>(admins),
        asDependency<AdminSessionsRepository>(sessions),
        asDependency<AdminLoginAttemptsRepository>(attempts),
        oneSlot,
      );

      await service.logIn({ email: EMAIL, password: PASSWORD });
      await failure(
        service.logIn({ email: EMAIL, password: "wrong wrong wrong" }),
      );
      attempts.countSince.mockResolvedValue(9);
      await failure(service.logIn({ email: EMAIL, password: PASSWORD }));
      attempts.record.mockRejectedValue(new Error("database down"));
      await expect(
        service.logIn({ email: EMAIL, password: PASSWORD }),
      ).rejects.toThrow("database down");

      expect(oneSlot.tryAcquire()).toBeTypeOf("function");
    });
  });

  describe("findActiveSession", () => {
    const TOKEN = "t".repeat(43);

    it("returns the session's ids", async () => {
      expect(await service.findActiveSession(TOKEN)).toEqual({
        sessionId: "session-1",
        adminId: "admin-1",
      });
    });

    it("looks the token up by its hash", async () => {
      await service.findActiveSession(TOKEN);

      const tokenHash = sessions.findActive.mock.calls[0]?.[1];

      expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(tokenHash).not.toContain(TOKEN);
    });

    it("returns null when there is no active session", async () => {
      sessions.findActive.mockResolvedValue(null);

      expect(await service.findActiveSession(TOKEN)).toBeNull();
      expect(sessions.touch).not.toHaveBeenCalled();
    });

    it("refreshes a session last used over 5 minutes ago", async () => {
      sessions.findActive.mockResolvedValue(
        makeSession({ updatedAt: instant("2020-01-01T00:00:00Z") }),
      );

      await service.findActiveSession(TOKEN);

      expect(sessions.touch).toHaveBeenCalledOnce();
    });

    it("leaves a session used moments ago alone", async () => {
      sessions.findActive.mockResolvedValue(
        makeSession({ updatedAt: Temporal.Now.instant() }),
      );

      await service.findActiveSession(TOKEN);

      expect(sessions.touch).not.toHaveBeenCalled();
    });
  });

  it("logs out by deleting the session", async () => {
    await service.logOut("session-1");

    expect(sessions.delete).toHaveBeenCalledWith(fake.db, "session-1");
  });
});
