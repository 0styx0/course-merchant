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

import { AdminLoginAttemptsRepository } from "@/auth/login/admin-login-attempts.repository.js";
import { AdminSessionsRepository } from "@/auth/sessions/admin-sessions.repository.js";
import { AdminSessionsService } from "@/auth/sessions/admin-sessions.service.js";
import { AdminsRepository, type Admin } from "@/auth/admins.repository.js";
import { HashingSlots } from "@/auth/login/hashing-slots.js";
import { hashPassword } from "@/auth/login/password-hashing.js";
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
import { makeSession } from "@/auth/test/unit/admin-sessions.service/admin-sessions.service.fixtures.js";

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
