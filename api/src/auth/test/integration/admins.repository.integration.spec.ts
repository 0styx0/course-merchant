import { describe, expect, it } from "vitest";

import { AdminsRepository } from "@/auth/admins.repository.js";
import { emailSchema } from "@/common/validation/email.schema.js";
import { db } from "@/prisma/db.js";

describe("AdminsRepository (integration)", () => {
  const repository = new AdminsRepository();

  function findAdmins() {
    return db.orm.public.Admin.all();
  }

  it("creates an admin, then replaces the password of the same one", async () => {
    const created = await repository.setPassword(
      db,
      "owner@example.com",
      "hash-1",
    );
    const updated = await repository.setPassword(
      db,
      "owner@example.com",
      "hash-2",
    );

    expect(created.outcome).toBe("created");
    expect(updated.outcome).toBe("updated");
    expect(updated.adminId).toBe(created.adminId);

    const admins = await findAdmins();

    expect(admins).toHaveLength(1);
    expect(admins[0]).toMatchObject({
      email: "owner@example.com",
      passwordHash: "hash-2",
    });
  });

  it("treats different case or spaces in the email as one admin", async () => {
    const email = (typed: string) => emailSchema.parse(typed);

    await repository.setPassword(db, email("Owner@Example.com"), "hash-1");
    const { outcome } = await repository.setPassword(
      db,
      email("  owner@example.COM "),
      "hash-2",
    );

    expect(outcome).toBe("updated");
    expect(await findAdmins()).toHaveLength(1);
  });

  it("finds an admin by email, or null", async () => {
    const { adminId } = await repository.setPassword(
      db,
      "owner@example.com",
      "hash-1",
    );

    expect(await repository.findByEmail(db, "owner@example.com")).toMatchObject(
      { id: adminId, passwordHash: "hash-1" },
    );
    expect(await repository.findByEmail(db, "other@example.com")).toBeNull();
  });
});
