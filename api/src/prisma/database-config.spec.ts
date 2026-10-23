import { describe, expect, it } from "vitest";
import { loadDatabaseUrl } from "./database-config.js";

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
});
