import "../../temporal.js";
import "dotenv/config.js";
import { createInterface } from "node:readline/promises";
import password from "@inquirer/password";
import { NestFactory } from "@nestjs/core";

import { emailSchema } from "@/common/validation/email.schema.js";
import { AdminPasswordsService } from "../admin-passwords.service.js";
import { newPasswordProblem } from "../password-hashing.js";
import { AdminCliModule } from "./admin-cli.module.js";

const USAGE = "Usage: yarn admin:set-password <email>";

function readEmail(): string {
  const result = emailSchema.safeParse(process.argv[2]);

  if (!result.success) {
    throw new Error(`Missing or invalid email. ${USAGE}`);
  }

  return result.data;
}

/** Asks twice, hidden, so a typo can't lock the owner out. */
async function promptForPassword(): Promise<string> {
  const first = await password({
    message: "New password",
    mask: true,
    validate: (value) => newPasswordProblem(value) ?? true,
  });
  const second = await password({ message: "Repeat the password", mask: true });

  if (first !== second) {
    throw new Error("The two passwords differ.");
  }

  return first;
}

/** One line from piped input, e.g. `printf %s "$PASSWORD" | yarn ...`. */
async function readPasswordFromStdin(): Promise<string> {
  const lines = createInterface({ input: process.stdin });

  try {
    for await (const line of lines) {
      return line;
    }
  } finally {
    lines.close();
  }

  throw new Error("No password was piped in.");
}

async function readNewPassword(): Promise<string> {
  const chosen = process.stdin.isTTY
    ? await promptForPassword()
    : await readPasswordFromStdin();
  const problem = newPasswordProblem(chosen);

  if (problem) {
    throw new Error(problem);
  }

  return chosen;
}

async function main() {
  const email = readEmail();
  const chosenPassword = await readNewPassword();

  const app = await NestFactory.createApplicationContext(AdminCliModule, {
    logger: ["error"],
  });

  try {
    const outcome = await app
      .get(AdminPasswordsService)
      .setPassword(email, chosenPassword);

    console.log(`${outcome}: ${email}`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  // the message only; stack traces and driver errors could echo input
  console.error(error instanceof Error ? error.message : "Failed.");
  process.exitCode = 1;
});
