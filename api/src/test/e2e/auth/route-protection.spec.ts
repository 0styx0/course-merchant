import type { INestApplication } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bearer, logInAsAdmin } from "../../admin-fixtures.js";
import { createE2eApp, httpServer } from "../e2e-helpers.js";

const METHODS = ["get", "post", "put", "delete"] as const;

type Method = (typeof METHODS)[number];

type Operation = {
  security?: Record<string, unknown>[];
};

type OpenApiFile = {
  security: Record<string, unknown>[];
  paths: Record<string, Partial<Record<Method, Operation>>>;
};

type Route = { method: Method; path: string; needsLogin: boolean };

/** Every operation in the contract, with whether it asks for a login. */
function routesInContract(): Route[] {
  const file = load(
    readFileSync(
      new URL("../../../../openapi/openapi-v1.yaml", import.meta.url),
      "utf8",
    ),
  ) as OpenApiFile;

  return Object.entries(file.paths).flatMap(([path, operations]) =>
    METHODS.flatMap((method) => {
      const operation = operations[method];

      if (!operation) {
        return [];
      }

      const security = operation.security ?? file.security;

      return [
        {
          method,
          // any value will do: authentication is checked before the id is
          path: `/v1${path.replace(/\{[^}]+\}/g, "x")}`,
          needsLogin: security.some((option) => "bearerAuth" in option),
        },
      ];
    }),
  );
}

const routes = routesInContract();

describe("route protection (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // an invalid body on purpose: the login check must come before validation
  function callWithoutToken({ method, path }: Route) {
    return request(httpServer(app))[method](path).send({ invalid: true });
  }

  it("reads the contract", () => {
    expect(routes.some((route) => route.needsLogin)).toBe(true);
    expect(routes.some((route) => !route.needsLogin)).toBe(true);
  });

  describe.each(routes.filter((route) => route.needsLogin))(
    "$method $path (needs a login)",
    (route) => {
      it("refuses a request without a token", async () => {
        const response = await callWithoutToken(route);

        expect(response.status).toBe(401);
        expect(response.headers["www-authenticate"]).toBe("Bearer");
      });
    },
  );

  describe.each(routes.filter((route) => !route.needsLogin))(
    "$method $path (public)",
    (route) => {
      it("doesn't ask for a login", async () => {
        const response = await callWithoutToken(route);

        expect(response.status).not.toBe(401);
      });
    },
  );

  it("tells caches not to keep a logged-in response", async () => {
    const token = await logInAsAdmin(app);

    const response = await request(httpServer(app))
      .get("/v1/admin/courses")
      .set("Authorization", bearer(token))
      .expect(200);

    expect(response.headers["cache-control"]).toBe("no-store");
  });
});
