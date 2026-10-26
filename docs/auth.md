# Admin authentication

Read this before working on admin login, logout, sessions, the auth guard, or the command that creates admins. It records what the code can't tell you: progress, design intent, and why each choice was made. Shapes live elsewhere and aren't repeated here: the schema is in [contract.prisma](../api/src/prisma/contract.prisma), and endpoints and error codes are in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml).

Keep this file current **in the same commit as the work**. Tick off status, add a decision row when something is decided, and when a step ships, cut its design notes down to decision rows.

## Status

Each step is one commit. Every step's tests are part of the step.

- [x] **1. Admin accounts:** the `Admin` table, password hashing, and `yarn admin:set-password <email>`.
- [ ] **2. Login and logout:** **Next**
  - [ ] Contract 1.2.0 (see *Contract*), then regenerate types for `api` and `web`.
  - [ ] `AdminSession` and `AdminLoginAttempt` tables, added to `integration.setup.ts` in FK order.
  - [ ] `auth/session-token.ts`, `auth/hashing-slots.ts`, `auth/admin-sessions.repository.ts`, `auth/admin-login-attempts.repository.ts`.
  - [ ] `auth/admin-sessions.service.ts` (`logIn`, `findActiveSession`, `logOut`), `auth/admin-sessions.controller.ts` and its Zod schema. Warm the dummy hash at startup (`onModuleInit`), so the first unknown-email login isn't slower.
  - [ ] `ErrorCodeAuth` in [error-codes.ts](../api/src/common/errors/error-codes.ts); optional `headers` on `ApiException`, applied by [problem-details.filter.ts](../api/src/common/errors/problem-details.filter.ts).
  - [ ] `auth/admin-auth.guard.ts`, `@Public()` and the current-session decorator. The guard is applied only to logout in this step.
  - [ ] Extend the set-password command: in the same transaction, delete that admin's sessions and that email's attempts.
  - [ ] Tests:
    - unit: hashing slots (a third caller is refused; a slot frees after a thrown error); guard (missing, malformed, unknown, expired, idle); service orchestration with `fakePrisma`;
    - integration: repositories; the age and idle rules with times passed in; the attempt limit with parallel logins run through the service, so a wrong transaction order fails the test;
    - e2e: login `201`; wrong password `401` with `WWW-Authenticate`; the 6th attempt `429` with `Retry-After`, also with mixed-case emails; logout then the same token gets `401`; set-password lifts a lockout.
- [ ] **3. Protect every admin endpoint:**
  - [ ] Register the guard globally (`APP_GUARD`); mark the courses, checkout, webhook and login handlers `@Public()`.
  - [ ] `Cache-Control: no-store` on every authenticated response.
  - [ ] `src/test/admin-fixtures.ts`: logs in; the four admin e2e specs use it.
  - [ ] Route-protection e2e test read from the OpenAPI file: every `bearerAuth` operation gives `401` with `WWW-Authenticate` without a token; every `security: []` operation doesn't give `401`. An unauthenticated request with an invalid body gets `401`, not `400`.
  - [ ] Docs: tick the admin-auth item in [courses.md](courses.md), remove the launch blocker in [payments.md](payments.md), update the README *Status* and [ARCHITECTURE.md](../ARCHITECTURE.md) (module table, a short login flow).
- [ ] **4. Cleanup job:**
  - [ ] `auth/admin-session-cleanup.ts`, hourly `@Interval` on every server: deletes sessions past 7 days or idle over 24 hours, and attempts older than 15 minutes. Deletes are safe to repeat, so servers need no coordination. Stub it in `createE2eApp` like `PaymentSweeper`.
  - [ ] Tests: integration only (what is deleted, what is kept).
- [ ] **Launch:** HTTPS between the web server and the API; `admin:set-password` run on the production server.

## Principles

- **All login state lives in Postgres.** No server keeps sessions, counters or secrets in memory, so any number of servers behave the same, with no sticky routing and no signing key to share. The one exception is the per-server cap on password hashes, which limits only that server's own load.
- **Deny by default.** A global guard protects every route; public handlers opt out with `@Public()`.
- **Store nothing replayable.** Tokens are kept as SHA-256 hashes and passwords as Argon2id hashes.
- **Unknown email and wrong password look the same:** same `401`, same timing.
- **Times and limits are constants in code**, like the sweeper's, not env settings. There is nothing to configure per deployment.
- **Auth errors are problem+json** like every other error, through `ApiException`.

## Flows

**Login.** `POST /v1/admin/sessions` with `{ email, password }`:
1. If this server already runs 2 password hashes, answer `429` with `Retry-After: 1`. The attempt isn't saved.
2. Save the attempt and commit it on its own, then count attempts for that email in the last 15 minutes. More than 5 gives `429` with `Retry-After`.
3. Verify the password (a dummy hash for unknown emails). Failure gives `401 INVALID_CREDENTIALS`.
4. In one transaction, create the session and delete that email's attempts. Return `{ token, absoluteExpiresAt }` once, with `Cache-Control: no-store`. The token is 256 random bits; only its SHA-256 hash is stored.

**Each admin request** sends `Authorization: Bearer <token>`. The guard hashes it and finds a session created under 7 days ago and used within 24 hours, otherwise `401` with `WWW-Authenticate: Bearer`. It updates `lastUsedAt` at most every 5 minutes.

**Logout.** `DELETE /v1/admin/sessions/current` deletes the row, so the token fails on every server at once.

**Creating admins.** `yarn admin:set-password <email>` runs the built file on a server. It creates the admin, or replaces the password of an existing one, and signs out that admin's sessions.

## Contract (1.1.0 to 1.2.0)

- `bearerAuth`: drop `bearerFormat: JWT`; it's a random string the API looks up.
- Add `createAdminSession` (`security: []`; `201`, `400`, `401 INVALID_CREDENTIALS`, `429 TOO_MANY_LOGIN_ATTEMPTS` with `Retry-After`) and `deleteCurrentAdminSession` (`204`, `401`).
- `401` carries `WWW-Authenticate: Bearer` (RFC 6750). Remove `403` and `Forbidden`: only admins can log in.
- `absoluteExpiresAt` is the latest end of the session; 24 hours unused ends it sooner.

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| Random token stored hashed, in Postgres | Logout and password changes work at once on every server. A leaked database has no usable tokens. SHA-256 is enough for a random token | JWT with logout clearing the cookie (a copied token works until it expires; a lost device can't be signed out); JWT + revocation table (still a read per request, plus a secret); short JWT + refresh token (logout doesn't end the JWT) |
| Global guard with `@Public()` | A new admin route can't be left open by forgetting a decorator | `@UseGuards` per controller; Passport (replaces only header parsing, adds packages and an error override) |
| Argon2id via the `argon2` package (19 MiB, 2 passes, 1 lane); `engines.node >= 26` | OWASP's first choice; prebuilt binaries; the settings are stored in each hash string. `engines` matches CI | Node's `crypto.argon2` (raw bytes, we'd write the string format); bcrypt; scrypt |
| Passwords NFKC-normalized inside the hashing module; 15 to 128 characters checked after normalizing | The same password from any keyboard matches, and the CLI and login can't differ. Done now, before any hash exists | Passwords as typed |
| Login limit: 5 attempts per normalized email per 15 minutes, in a table; the attempt is committed outside any transaction before counting | Shared by all servers. Parallel requests can't all pass: the 6th committed row sees 6. Inside one transaction each request would see only its own row | In-memory throttler (each server counts alone); Redis (new infrastructure); per IP (the API only sees the web server's address) |
| At most 2 password hashes at once per server; extra logins get `429` before their attempt is saved | The per-email limit doesn't cap total work: rotating emails could pile 19 MiB hashes onto the 4-thread pool | A global attempt cap in the database (lets one person lock out the owner) |
| Accepted: someone who knows the admin email can keep it locked | Rare for one owner; it lifts itself, and the set-password command clears the attempts at once | Permanent lockout; CAPTCHA |
| A login lasts 7 days at most and ends after 24 hours unused, with no stored `expiresAt` | Stricter than NIST's 30 days for password-only logins; no duplicated state | 24 hours with a 1-hour idle limit; an `expiresAt` column |
| Session, idle and limit times use the server clock (`Temporal.Now`); the app writes `createdAt`, `lastUsedAt` and `attemptedAt`, with no `DEFAULT now()` | Seconds of drift only move a session's end by seconds, and it saves a query per admin request. The app never compares its clock against a Postgres-filled column | `DatabaseClock` |
| `lastUsedAt` updated at most every 5 minutes with `.where(id, lastUsedAt < now - 5 min).updateAndCount(...)` | Keeps the idle rule without a write per request; the condition is part of the `UPDATE` | A write on every request; read then write |
| Admins are created by a command on a server; the password comes from a hidden prompt (`@inquirer/password`) or stdin, never an argument | No public sign-up and no default password (like Django's `createsuperuser`). Arguments leak into shell history and `ps` | A starting password in env settings; an invite flow; an outside login provider |
| The command boots `admin-cli.module.ts`, not `AppModule` | `AppModule` would start the email worker and sweeper and demand the Stripe and email settings | Booting the whole app |
| The command also deletes that admin's sessions and that email's attempts | A password change signs out every device and lifts a lockout | Leaving sessions alive |
| One shared `emailSchema` in `common/validation/`, used by checkout and auth | Login and checkout must clean an email the same way, or the same person could be two customers or miss their own admin account. Done in step 1, before a second copy exists | Repeating the line in auth (can drift); extracting in a later commit |
| Hashing tests check the settings in any order (`m`, `p`, `t`) | The `argon2` package writes `m=19456,p=1,t=2`, not the reference program's `m,t,p`. Both verify, and the settings are what matter | Asserting the doc's earlier `m,t,p` order (fails) |
| `engines.node >= 26`, and the README says 26+ | One supported version, matching CI | Keeping the README's older versions (the `argon2` build wasn't checked on them) |
| Drop `403` from the contract | A logged-in caller is always an admin | Keeping a response that can't happen |

## Follow-ups (not planned yet)

- Web login page: a server action stores the token in an `httpOnly; Secure; SameSite=Lax` cookie with `Max-Age` matching `absoluteExpiresAt`. Pass `Authorization` on each call (read from `cookies()`), never through shared module state; keep admin fetches uncached; a `401` clears the cookie and redirects to login. Belongs with the web admin pages.
- Re-hash on login (`argon2.needsRehash`) once the Argon2 settings are raised.
- "Log out everywhere" and password change through the API.
