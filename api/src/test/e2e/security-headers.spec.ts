import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createE2eApp, httpServer } from "./e2e-helpers.js";

describe("security headers (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // a success, an error from the error filter, and a refusal from the guard
  it.each([
    { response: "a public success", path: "/v1/courses", status: 200 },
    { response: "an unknown route", path: "/v1/no-such-route", status: 404 },
    { response: "a missing login", path: "/v1/admin/courses", status: 401 },
  ])("sends them on $response", async ({ path, status }) => {
    const res = await request(httpServer(app)).get(path);

    expect(res.status).toBe(status);
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});
