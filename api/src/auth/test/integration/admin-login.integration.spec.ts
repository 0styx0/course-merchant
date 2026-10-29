import { beforeAll, describe, expect, it } from "vitest";

import { AdminLoginAttemptsRepository } from "@/auth/login/admin-login-attempts.repository.js";
import { AdminSessionsRepository } from "@/auth/sessions/admin-sessions.repository.js";
import { AdminSessionsService } from "@/auth/sessions/admin-sessions.service.js";
import { AdminsRepository } from "@/auth/admins.repository.js";
import { HashingSlots } from "@/auth/login/hashing-slots.js";
import { hashPassword } from "@/auth/login/password-hashing.js";
import { ApiException } from "@/common/errors/api.exception.js";
import { db } from "@/prisma/db.js";
import { PrismaService } from "@/prisma/prisma.service.js";

const PASSWORD = "correct horse battery staple";
const EMAIL = "owner@example.com";

describe("AdminSessionsService.logIn (integration)", () => {
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hashPassword(PASSWORD);
  });

  // real repositories and database; room for every parallel login, so the
  // per-email limit is what stops them
  function serviceWithRoomFor(logins: number) {
    return new AdminSessionsService(
      new PrismaService(),
      new AdminsRepository(),
      new AdminSessionsRepository(),
      new AdminLoginAttemptsRepository(),
      new HashingSlots(logins),
    );
  }

  async function outcomes(promises: Promise<unknown>[]) {
    const settled = await Promise.allSettled(promises);

    return settled.map(outcomeOf);
  }

  function outcomeOf(result: PromiseSettledResult<unknown>) {
    if (result.status === "fulfilled") {
      return "logged in";
    }

    return result.reason instanceof ApiException
      ? String(result.reason.code)
      : "crashed";
  }

  it("stores a session and clears the attempts after a good login", async () => {
    await new AdminsRepository().setPassword(db, EMAIL, passwordHash);
    const service = serviceWithRoomFor(2);

    await expect(
      service.logIn({ email: EMAIL, password: "not the password at all" }),
    ).rejects.toBeInstanceOf(ApiException);
    const { token } = await service.logIn({ email: EMAIL, password: PASSWORD });

    expect(await db.orm.public.AdminSession.all()).toHaveLength(1);
    expect(await db.orm.public.AdminLoginAttempt.all()).toHaveLength(0);
    expect(await service.findActiveSession(token)).not.toBeNull();
  });

  it("lets at most 5 of 8 parallel wrong passwords through to the password check", async () => {
    await new AdminsRepository().setPassword(db, EMAIL, passwordHash);
    const service = serviceWithRoomFor(8);

    const results = await outcomes(
      Array.from({ length: 8 }, () =>
        service.logIn({ email: EMAIL, password: "not the password at all" }),
      ),
    );

    const checked = results.filter((r) => r === "INVALID_CREDENTIALS");
    const refused = results.filter((r) => r === "TOO_MANY_LOGIN_ATTEMPTS");

    expect(checked.length).toBeLessThanOrEqual(5);
    expect(checked.length + refused.length).toBe(8);
    expect(refused.length).toBeGreaterThanOrEqual(3);
  });

  it("stops parallel logins with the right password too, so guesses can't win a race", async () => {
    await new AdminsRepository().setPassword(db, EMAIL, passwordHash);
    const service = serviceWithRoomFor(8);

    const results = await outcomes(
      Array.from({ length: 8 }, () =>
        service.logIn({ email: EMAIL, password: PASSWORD }),
      ),
    );

    expect(results.filter((r) => r === "logged in").length).toBeLessThanOrEqual(
      5,
    );
    expect(results).not.toContain("crashed");
  });

  it("refuses a third login at once on a server with 2 slots", async () => {
    await new AdminsRepository().setPassword(db, EMAIL, passwordHash);
    const service = serviceWithRoomFor(2);

    const results = await outcomes(
      Array.from({ length: 3 }, () =>
        service.logIn({ email: EMAIL, password: "not the password at all" }),
      ),
    );

    expect(results.sort()).toEqual([
      "INVALID_CREDENTIALS",
      "INVALID_CREDENTIALS",
      "TOO_MANY_LOGIN_ATTEMPTS",
    ]);
    expect(await db.orm.public.AdminLoginAttempt.all()).toHaveLength(2);
  });
});
