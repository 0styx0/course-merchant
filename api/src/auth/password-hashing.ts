import * as argon2 from "argon2";

// OWASP's first-choice Argon2id settings. They are stored inside each hash
// string, so raising them later doesn't break existing hashes
const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456, // KiB, so 19 MiB
  timeCost: 2,
  parallelism: 1,
};

const MIN_PASSWORD_LENGTH = 15;
const MAX_PASSWORD_LENGTH = 128;

/**
 * Converts equivalent Unicode spellings (`é` as one character, or `e` plus an
 * accent) to one form, so a password typed on any keyboard matches. Every
 * function here applies it, so the command and login can't differ.
 */
function normalizePassword(password: string): string {
  return password.normalize("NFKC");
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(normalizePassword(password), ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(passwordHash, normalizePassword(password));
}

/**
 * Says what is wrong with a new password, or returns null when it is
 * acceptable. Length is counted after normalizing, in characters.
 */
export function newPasswordProblem(password: string): string | null {
  const length = [...normalizePassword(password)].length;

  if (length < MIN_PASSWORD_LENGTH) {
    return `The password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (length > MAX_PASSWORD_LENGTH) {
    return `The password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }

  return null;
}

let dummyHash: Promise<string> | undefined;

/**
 * A real hash of a throwaway password nobody can type back. Verifying against
 * it for an unknown email costs the same time as a wrong password, so
 * response time doesn't reveal which emails are admins. Made on first use.
 */
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(crypto.randomUUID());
  return dummyHash;
}
