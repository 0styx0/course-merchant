import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "vitest";

import { AdminSessionsRepository } from "@/auth/admin-sessions.repository.js";
import { AdminsRepository } from "@/auth/admins.repository.js";
import { activeSessionCutoffs, touchCutoff } from "@/auth/session-lifetime.js";
import { db } from "@/prisma/db.js";
import { toDatabasePrecision } from "@/test/test-helpers.js";

const NOW = Temporal.Instant.from("2026-10-26T12:00:00Z");

describe("AdminSessionsRepository (integration)", () => {
  const repository = new AdminSessionsRepository();
  let adminId: string;

  beforeEach(async () => {
    ({ adminId } = await new AdminsRepository().setPassword(
      db,
      "owner@example.com",
      "hash",
    ));
  });

  function insertSession(
    tokenHash: string,
    times: { createdAt: Temporal.Instant; updatedAt: Temporal.Instant },
  ) {
    return db.orm.public.AdminSession.create({
      adminId,
      tokenHash,
      ...times,
    });
  }

  function findActive(tokenHash: string) {
    return repository.findActive(db, tokenHash, activeSessionCutoffs(NOW));
  }

  it("finds a session by its token hash, and no other", async () => {
    const created = await repository.create(db, { adminId, tokenHash: "a" });

    expect(
      (
        await repository.findActive(
          db,
          "a",
          activeSessionCutoffs(created.createdAt),
        )
      )?.id,
    ).toBe(created.id);
    expect(
      await repository.findActive(
        db,
        "b",
        activeSessionCutoffs(created.createdAt),
      ),
    ).toBeNull();
  });

  it("refuses a second session with the same token hash", async () => {
    await repository.create(db, { adminId, tokenHash: "a" });

    await expect(
      repository.create(db, { adminId, tokenHash: "a" }),
    ).rejects.toThrow();
  });

  describe("the age rule", () => {
    it("keeps a session just under 7 days old", async () => {
      await insertSession("young", {
        createdAt: NOW.subtract({ hours: 7 * 24 }).add({ seconds: 1 }),
        updatedAt: NOW,
      });

      expect(await findActive("young")).not.toBeNull();
    });

    it("ends a session exactly 7 days old, however recently it was used", async () => {
      await insertSession("old", {
        createdAt: NOW.subtract({ hours: 7 * 24 }),
        updatedAt: NOW,
      });

      expect(await findActive("old")).toBeNull();
    });
  });

  describe("the idle rule", () => {
    it("keeps a session used just under 24 hours ago", async () => {
      await insertSession("busy", {
        createdAt: NOW.subtract({ hours: 48 }),
        updatedAt: NOW.subtract({ hours: 24 }).add({ seconds: 1 }),
      });

      expect(await findActive("busy")).not.toBeNull();
    });

    it("ends a session unused for exactly 24 hours", async () => {
      await insertSession("idle", {
        createdAt: NOW.subtract({ hours: 48 }),
        updatedAt: NOW.subtract({ hours: 24 }),
      });

      expect(await findActive("idle")).toBeNull();
    });
  });

  describe("touch", () => {
    it("moves the last-used time of a session last used over 5 minutes ago", async () => {
      const session = await insertSession("a", {
        createdAt: NOW.subtract({ hours: 2 }),
        updatedAt: NOW.subtract({ minutes: 6 }),
      });

      const touched = await repository.touch(
        db,
        session.id,
        NOW,
        touchCutoff(NOW),
      );
      const [reloaded] = await db.orm.public.AdminSession.all();

      expect(touched).toBe(true);
      expect(reloaded?.updatedAt.toString()).toBe(
        toDatabasePrecision(NOW.toString()),
      );
    });

    it("leaves a session used under 5 minutes ago alone", async () => {
      const lastUsed = NOW.subtract({ minutes: 4 });
      const session = await insertSession("a", {
        createdAt: NOW.subtract({ hours: 2 }),
        updatedAt: lastUsed,
      });

      const touched = await repository.touch(
        db,
        session.id,
        NOW,
        touchCutoff(NOW),
      );
      const [reloaded] = await db.orm.public.AdminSession.all();

      expect(touched).toBe(false);
      expect(reloaded?.updatedAt.toString()).toBe(lastUsed.toString());
    });

    it("writes once when requests touch the same session in parallel", async () => {
      const session = await insertSession("a", {
        createdAt: NOW.subtract({ hours: 2 }),
        updatedAt: NOW.subtract({ minutes: 6 }),
      });

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          repository.touch(db, session.id, NOW, touchCutoff(NOW)),
        ),
      );

      expect(results.filter(Boolean)).toHaveLength(1);
    });
  });

  it("deletes one session, or all of an admin's", async () => {
    const times = { createdAt: NOW, updatedAt: NOW };
    const first = await insertSession("a", times);
    await insertSession("b", times);

    await repository.delete(db, first.id);
    expect(await db.orm.public.AdminSession.all()).toHaveLength(1);

    await repository.deleteAllForAdmin(db, adminId);
    expect(await db.orm.public.AdminSession.all()).toHaveLength(0);
  });
});
