import { describe, expect, it } from "vitest";

import {
  createSessionToken,
  hashSessionToken,
  isWellFormedSessionToken,
} from "@/auth/sessions/session-token.js";

describe("session tokens", () => {
  it("makes a different well-formed token each time", () => {
    const first = createSessionToken();
    const second = createSessionToken();

    expect(first).not.toBe(second);
    expect(isWellFormedSessionToken(first)).toBe(true);
    expect(first).toHaveLength(43);
  });

  it("hashes to the same 64 hex characters every time, unlike the token", () => {
    const token = createSessionToken();

    expect(hashSessionToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toContain(token);
  });

  it.each(["", "short", "a".repeat(44), `${"a".repeat(42)}!`, " ".repeat(43)])(
    "rejects the malformed token %j",
    (value) => {
      expect(isWellFormedSessionToken(value)).toBe(false);
    },
  );
});
