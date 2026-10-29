import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { isWellFormedSessionToken } from "@/auth/sessions/session-token.js";
import type { AdminSessionResponse, ProblemDetails } from "types.js";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  setAdminPassword,
} from "../../admin-fixtures.js";
import {
  createE2eApp,
  httpServer,
  type TypedResponse,
} from "../e2e-helpers.js";

const WRONG_PASSWORD = "not the password at all";
const NEW_PASSWORD = "a brand new password 123";

describe("POST /v1/admin/sessions (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await setAdminPassword();
  });

  function logIn(body: object) {
    return request(httpServer(app)).post("/v1/admin/sessions").send(body);
  }

  function logInWith(password: string, email = ADMIN_EMAIL) {
    return logIn({ email, password });
  }

  it("starts a session and returns its token once", async () => {
    const response: TypedResponse<AdminSessionResponse> =
      await logInWith(ADMIN_PASSWORD).expect(201);

    expect(response.headers["cache-control"]).toBe("no-store");
    expect(isWellFormedSessionToken(response.body.token)).toBe(true);

    const lifetimeMs = Date.parse(response.body.absoluteExpiresAt) - Date.now();
    expect(lifetimeMs).toBeGreaterThan(6.99 * 24 * 3600_000);
    expect(lifetimeMs).toBeLessThanOrEqual(7 * 24 * 3600_000);
  });

  it("accepts the email in any case, with spaces", async () => {
    await logInWith(ADMIN_PASSWORD, "  Owner@Example.COM ").expect(201);
  });

  it("answers a wrong password and an unknown email identically", async () => {
    const wrongPassword: TypedResponse<ProblemDetails> =
      await logInWith(WRONG_PASSWORD).expect(401);
    const unknownEmail: TypedResponse<ProblemDetails> = await logInWith(
      ADMIN_PASSWORD,
      "nobody@example.com",
    ).expect(401);

    expect(wrongPassword.headers["www-authenticate"]).toBe("Bearer");
    expect(wrongPassword.headers["content-type"]).toMatch(
      /application\/problem\+json/,
    );
    expect(wrongPassword.body.code).toBe("INVALID_CREDENTIALS");
    expect(unknownEmail.headers["www-authenticate"]).toBe("Bearer");
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it("rejects a malformed body without counting an attempt", async () => {
    for (let i = 0; i < 6; i++) {
      await logIn({ email: "not-an-email", password: "x" }).expect(400);
    }
    await logInWith(ADMIN_PASSWORD).expect(201);
  });

  it("rejects an unknown field", async () => {
    const response: TypedResponse<ProblemDetails> = await logIn({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      remember: true,
    }).expect(400);

    expect(response.body.code).toBe("VALIDATION_FAILED");
  });

  describe("the attempt limit", () => {
    async function useUpFiveAttempts(
      emailFor: (n: number) => string = () => ADMIN_EMAIL,
    ) {
      for (let n = 0; n < 5; n++) {
        await logInWith(WRONG_PASSWORD, emailFor(n)).expect(401);
      }
    }

    it("refuses the 6th attempt, even with the right password", async () => {
      await useUpFiveAttempts();

      const response: TypedResponse<ProblemDetails> =
        await logInWith(ADMIN_PASSWORD).expect(429);

      expect(response.headers["retry-after"]).toBe("900");
      expect(response.body.code).toBe("TOO_MANY_LOGIN_ATTEMPTS");
    });

    it("counts one email however it is capitalized", async () => {
      await useUpFiveAttempts((n) =>
        n % 2 ? "OWNER@example.com" : " owner@EXAMPLE.com",
      );

      await logInWith(ADMIN_PASSWORD).expect(429);
    });

    it("keeps counting emails apart", async () => {
      await useUpFiveAttempts();

      await logInWith(ADMIN_PASSWORD, "other@example.com").expect(401);
    });

    it("is lifted by setting a new password", async () => {
      await useUpFiveAttempts();
      await logInWith(ADMIN_PASSWORD).expect(429);

      await setAdminPassword(NEW_PASSWORD);

      await logInWith(NEW_PASSWORD).expect(201);
    });

    it("starts over after a good login", async () => {
      for (let round = 0; round < 3; round++) {
        for (let wrong = 0; wrong < 3; wrong++) {
          await logInWith(WRONG_PASSWORD).expect(401);
        }
        await logInWith(ADMIN_PASSWORD).expect(201);
      }
    });
  });
});
