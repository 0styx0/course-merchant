import { Test } from "@nestjs/testing";

import { AdminPasswordsService } from "@/auth/admin-passwords.service.js";
import { AdminCliModule } from "@/auth/cli/admin-cli.module.js";

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
