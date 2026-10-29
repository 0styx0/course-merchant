import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AdminPasswordsService } from "@/auth/login/admin-passwords.service.js";
import { AdminCliModule } from "@/auth/cli/admin-cli.module.js";
import type { AdminSessionResponse } from "types.js";
import { httpServer, type TypedResponse } from "./e2e/e2e-helpers.js";

export const ADMIN_EMAIL = "owner@example.com";
export const ADMIN_PASSWORD = "correct horse battery staple";

/**
 * Sets an admin's password the way `yarn admin:set-password` does: the same
 * service, so a test sees the same side effects (sessions signed out, a
 * lockout lifted). Uses the database the tests already share.
 */
export async function setAdminPassword(
  password: string = ADMIN_PASSWORD,
  email: string = ADMIN_EMAIL,
) {
  return (await passwordsService()).setPassword(email, password);
}

// compiled once per test file; never closed, because closing it would close
// the database client the tests share
let passwords: Promise<AdminPasswordsService> | undefined;

function passwordsService() {
  passwords ??= Test.createTestingModule({ imports: [AdminCliModule] })
    .compile()
    .then((moduleRef) => moduleRef.get(AdminPasswordsService));

  return passwords;
}

/** The `Authorization` header value for a session token. */
export function bearer(token: string) {
  return `Bearer ${token}`;
}

/**
 * Creates the admin and logs in through the real endpoint, returning the
 * session token. The tests wipe every table before each test, so call this in
 * `beforeEach`.
 */
export async function logInAsAdmin(app: INestApplication): Promise<string> {
  await setAdminPassword();

  const response: TypedResponse<AdminSessionResponse> = await request(
    httpServer(app),
  )
    .post("/v1/admin/sessions")
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    .expect(201);

  return response.body.token;
}
