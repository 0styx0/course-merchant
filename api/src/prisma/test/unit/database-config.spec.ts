import { describe, expect, it } from "vitest";
import { loadDatabaseUrl } from "@/prisma/database-config.js";

describe("loadDatabaseUrl", () => {
  it("returns a postgres URL", () => {
    const url = "postgresql://user:pass@localhost:5432/db";
    expect(loadDatabaseUrl({ DATABASE_URL: url })).toBe(url);
  });

  it("throws when the URL is missing", () => {
    expect(() => loadDatabaseUrl({})).toThrow(/DATABASE_URL/);
  });

  it("throws on another scheme without echoing the value", () => {
    const attempt = () =>
      loadDatabaseUrl({ DATABASE_URL: "mysql://user:secret@host/db" });
    expect(attempt).toThrow(/DATABASE_URL/);
    expect(attempt).not.toThrow(/secret/);
  });

  it.each([
    "postgresql://user:pass@localhost:5432/db",
    "postgresql://user:pass@127.0.0.1:5432/db",
    "postgresql://user:pass@[::1]:5432/db",
    "postgresql:///db?host=/var/run/postgresql",
  ])("accepts %s without encryption, since it stays on this machine", (url) => {
    expect(loadDatabaseUrl({ DATABASE_URL: url })).toBe(url);
  });

  it.each(["require", "verify-ca", "verify-full"])(
    "accepts a remote database with sslmode=%s",
    (mode) => {
      const url = `postgresql://user:pass@db.example.com/db?sslmode=${mode}`;

      expect(loadDatabaseUrl({ DATABASE_URL: url })).toBe(url);
    },
  );

  it.each([
    "postgresql://user:secret@db.example.com/db",
    "postgresql://user:secret@db.example.com/db?sslmode=disable",
    "postgresql://user:secret@db.example.com/db?sslmode=prefer",
  ])("refuses %s, which can fall back to plain text", (url) => {
    const attempt = () => loadDatabaseUrl({ DATABASE_URL: url });

    expect(attempt).toThrow(/DATABASE_URL must end in \?sslmode=require/);
    expect(attempt).not.toThrow(/secret/);
  });

  it("refuses an unparsable URL without echoing it", () => {
    const attempt = () =>
      loadDatabaseUrl({ DATABASE_URL: "postgresql://u:p@ss@@[bad/db" });

    expect(attempt).toThrow(/DATABASE_URL must be a valid URL/);
    expect(attempt).not.toThrow(/p@ss/);
  });
});
