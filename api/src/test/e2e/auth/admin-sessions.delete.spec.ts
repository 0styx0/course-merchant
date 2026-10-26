import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

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

const NEW_PASSWORD = "a brand new password 123";

describe("DELETE /v1/admin/sessions/current (e2e)", () => {
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

  async function logIn() {
    const response: TypedResponse<AdminSessionResponse> = await request(
      httpServer(app),
    )
      .post("/v1/admin/sessions")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(201);

    return response.body.token;
  }

  function logOut(token: string) {
    return logOutWithHeader(`Bearer ${token}`);
  }

  function logOutWithHeader(authorization?: string) {
    const call = request(httpServer(app)).delete("/v1/admin/sessions/current");

    return authorization ? call.set("Authorization", authorization) : call;
  }

  it("ends the session, so the same token is refused afterwards", async () => {
    const token = await logIn();

    await logOut(token).expect(204);

    const again: TypedResponse<ProblemDetails> =
      await logOut(token).expect(401);
    expect(again.headers["www-authenticate"]).toBe("Bearer");
    expect(again.body.code).toBe("UNAUTHORIZED");
  });

  it("ends only that session", async () => {
    const laptop = await logIn();
    const phone = await logIn();

    await logOut(laptop).expect(204);

    await logOut(phone).expect(204);
  });

  it("refuses a request with no token, a malformed one or an unknown one", async () => {
    for (const authorization of [
      undefined,
      "Bearer",
      "Bearer not-a-token",
      `Bearer ${"a".repeat(43)}`,
      "Basic YWRtaW46YWRtaW4=",
    ]) {
      const response: TypedResponse<ProblemDetails> =
        await logOutWithHeader(authorization).expect(401);

      expect(response.headers["www-authenticate"]).toBe("Bearer");
      expect(response.body.code).toBe("UNAUTHORIZED");
    }
  });

  it("is signed out by setting a new password", async () => {
    const token = await logIn();

    await setAdminPassword(NEW_PASSWORD);

    await logOut(token).expect(401);
  });
});
