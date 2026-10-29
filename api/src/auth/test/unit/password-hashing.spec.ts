import { describe, expect, it } from "vitest";

import {
  getDummyHash,
  hashPassword,
  newPasswordProblem,
  verifyPassword,
} from "@/auth/login/password-hashing.js";

const password = "correct horse battery staple";

describe("password hashing", () => {
  it("verifies the password it hashed and rejects another", async () => {
    const hash = await hashPassword(password);

    expect(await verifyPassword(hash, password)).toBe(true);
    expect(await verifyPassword(hash, `${password}!`)).toBe(false);
  });

  it("stores the Argon2id settings in the hash string", async () => {
    const [, algorithm, version, settings] = (
      await hashPassword(password)
    ).split("$");

    expect(algorithm).toBe("argon2id");
    expect(version).toBe("v=19");
    // the argon2 package writes these in the order m, p, t
    expect(settings?.split(",").sort()).toEqual(["m=19456", "p=1", "t=2"]);
  });

  it("verifies a hash made by the official argon2 program", async () => {
    // printf %s "correct horse battery staple" |
    //   argon2 c29tZXNhbHQxMjM0NTY -id -t 2 -k 19456 -p 1 -e
    const officialHash =
      "$argon2id$v=19$m=19456,t=2,p=1$YzI5dFpYTmhiSFF4TWpNME5UWQ$+bF0ydVMNBb0j3ys9sNJAORw/aj0FVUbrvZu0A741TY";

    expect(await verifyPassword(officialHash, password)).toBe(true);
  });

  it("matches a password typed with a composed or a decomposed accent", async () => {
    const composed = "café au lait, please!";
    const decomposed = "café au lait, please!";
    const hash = await hashPassword(composed);

    expect(await verifyPassword(hash, decomposed)).toBe(true);
  });

  describe("newPasswordProblem", () => {
    it("accepts 15 and 128 characters", () => {
      expect(newPasswordProblem("a".repeat(15))).toBeNull();
      expect(newPasswordProblem("a".repeat(128))).toBeNull();
    });

    it("rejects 14 and 129 characters", () => {
      expect(newPasswordProblem("a".repeat(14))).not.toBeNull();
      expect(newPasswordProblem("a".repeat(129))).not.toBeNull();
    });

    it("counts after normalizing", () => {
      // 14 letters plus a decomposed accent: 15 code points, 14 after NFKC
      expect(newPasswordProblem(`${"a".repeat(13)}é`)).not.toBeNull();
      // 128 composed characters written as 256 code points
      expect(newPasswordProblem("é".repeat(128))).toBeNull();
    });
  });

  it("never matches the dummy hash", async () => {
    expect(await verifyPassword(await getDummyHash(), password)).toBe(false);
    expect(await getDummyHash()).toBe(await getDummyHash());
  });
});
