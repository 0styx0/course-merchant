import { describe, expect, it } from "vitest";
import { loadPort } from "@/config/port-config.js";

describe("loadPort", () => {
  it("defaults to 3000", () => {
    expect(loadPort({})).toBe(3000);
  });

  it("reads a valid port", () => {
    expect(loadPort({ PORT: "8080" })).toBe(8080);
  });

  it.each(["abc", "0", "70000", "80.5", ""])("rejects %j", (value) => {
    expect(() => loadPort({ PORT: value })).toThrow(/PORT/);
  });
});
