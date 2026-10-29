# Admin authentication

Read this before working on admin login, logout, sessions, the auth guard, or the command that creates admins. It records what the code can't tell you: progress, design intent, and why each choice was made. Shapes live elsewhere and aren't repeated here: the schema is in [contract.prisma](../api/src/prisma/contract.prisma), and endpoints and error codes are in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml).

Keep this file current **in the same commit as the work**. Tick off status, add a decision row when something is decided, and when a step ships, cut its design notes down to decision rows.

## Status

Each step is one commit. Every step's tests are part of the step.

- [x] **1. Admin accounts:** the `Admin` table, password hashing, and `yarn admin:set-password <email>`.
- [x] **2. Login and logout:** `POST /v1/admin/sessions`, `DELETE /v1/admin/sessions/current`, the `AdminSession` and `AdminLoginAttempt` tables, the guard (applied only to logout), and the set-password command signing out sessions and lifting lockouts.
- [x] **3. Protect every admin endpoint:** the guard is global, the public controllers are `@Public()`, authenticated responses carry `Cache-Control: no-store`, and a test checks every route against the OpenAPI file.
- [x] **4. Cleanup job:** `auth/sessions/admin-session-cleanup.ts`, hourly `@Interval` on every server, deleting sessions past 7 days or idle over 24 hours and attempts older than 15 minutes. Integration tests only.
- [x] **5. HTTPS check:** in production the web app refuses an `API_BASE_URL` that isn't `https://` or on the same machine (`web/src/lib/api/config/base-url.ts`). Today that means the build fails and every request fails, but the server process stays up; [web.md](web.md) step 1 makes it exit at boot too.
- [ ] **Launch:** **Next** run `admin:set-password` on the production server, and point `API_BASE_URL` at the API's `https://` address (the web server now refuses anything else). Operations only; no code.

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

**Each admin request** sends `Authorization: Bearer <token>`. The guard hashes it and finds a session created under 7 days ago and used within 24 hours, otherwise `401` with `WWW-Authenticate: Bearer`. It refreshes the session's `updatedAt` (its last-used time) at most every 5 minutes.

**Logout.** `DELETE /v1/admin/sessions/current` deletes the row, so the token fails on every server at once.

**Creating admins.** `yarn admin:set-password <email>` runs the built file on a server. It creates the admin, or replaces the password of an existing one, and signs out that admin's sessions.

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
| Postgres fills `createdAt` (`DEFAULT now()`); the 7-day, 24-hour, 5-minute and 15-minute cutoffs come from the server clock (`Temporal.Now`), so drift is accepted. An exception to the `DatabaseClock` rule in api/CLAUDE.md | A few seconds of drift only move a session's end or an attempt's window by seconds, and it saves a query on every admin request | `DatabaseClock` (a query per request); the app writing `createdAt` itself |
| `AdminSession.updatedAt` (ORM-filled) is the last-used time; there is no `lastUsedAt` column. `AdminLoginAttempt` has only `createdAt` | A touch is the only update a session ever gets, so a second column would always hold the same value. Attempts are never updated | `lastUsedAt` beside `updatedAt` |
| A touch only when the session was last used over 5 minutes ago: `.where(id, updatedAt < now - 5 min).updateAndCount({ updatedAt: now })`, skipped without a query when the row just read is fresh | Keeps the idle rule without a write per request; the condition is part of the `UPDATE`, so parallel requests write once. The ORM fills `updatedAt` itself, but an explicit value wins | A write on every request; read then write |
| `Retry-After` is a fixed 900 seconds when an email is over its limit | Never too short. Every refused try is saved too, so waiting less would only extend the lock | Working out the exact second from the attempt times (another query) |
| Login accepts a password of 1 to 1024 characters | The 15 to 128 rule is for new passwords; at login a wrong length is just a wrong password. The upper bound only caps the input | Reusing the new-password rule |
| Every `401` carries plain `WWW-Authenticate: Bearer`, including `INVALID_CREDENTIALS` on login | HTTP requires the header on every 401; the problem+json `code` says what went wrong, so `error="invalid_token"` adds nothing | RFC 6750's `error` parameter |
| A full hashing cap answers `429 TOO_MANY_LOGIN_ATTEMPTS` with `Retry-After: 1` and its own `detail` | The contract has one `429` code for login | A separate code |
| The token hash is stored as hex text | Easy to look up and read when debugging; unique and indexed either way | Raw bytes |
| The set-password transaction lives in `AdminPasswordsService`, which the command calls | The command script runs as soon as it's imported, so no test could call it; the e2e tests call the service | Spawning the built file from tests |
| `bearerAuth` is no longer `bearerFormat: JWT` | The token is a random string the API looks up | Keeping the label |
| Admins are created by a command on a server; the password comes from a hidden prompt (`@inquirer/password`) or stdin, never an argument | No public sign-up and no default password (like Django's `createsuperuser`). Arguments leak into shell history and `ps` | A starting password in env settings; an invite flow; an outside login provider |
| The command boots `admin-cli.module.ts`, not `AppModule` | `AppModule` would start the email worker and sweeper and demand the Stripe and email settings | Booting the whole app |
| The command also deletes that admin's sessions and that email's attempts | A password change signs out every device and lifts a lockout | Leaving sessions alive |
| One shared `emailSchema` in `common/validation/`, used by checkout and auth | Login and checkout must clean an email the same way, or the same person could be two customers or miss their own admin account. Done in step 1, before a second copy exists | Repeating the line in auth (can drift); extracting in a later commit |
| Hashing tests check the settings in any order (`m`, `p`, `t`) | The `argon2` package writes `m=19456,p=1,t=2`, not the reference program's `m,t,p`. Both verify, and the settings are what matter | Asserting the doc's earlier `m,t,p` order (fails) |
| `engines.node >= 26`, and the README says 26+ | One supported version, matching CI | Keeping the README's older versions (the `argon2` build wasn't checked on them) |
| The global guard is registered in `AuthModule` with `APP_GUARD`; `@Public()` sits on the whole public controllers (courses, checkout, webhook) and on login | Deny by default, and a new handler in a public controller is public too, which matches the contract's public default for those paths | Marking each handler |
| The guard sets `Cache-Control: no-store` once it accepts a session, before the handler runs; the contract lists the header on every admin success response | One line covers every logged-in response, errors included. Admin responses hold private `contentUrl`s | A global interceptor (another file for the same effect); documenting nothing |
| `route-protection.spec.ts` reads the OpenAPI file (`js-yaml`, a dev dependency) and sends each operation an invalid body without a token | The list of protected routes can't drift from the contract, and it proves the login check runs before validation | A hand-written route list (goes stale silently) |
| The cleanup job deletes exactly the sessions `findActive` would no longer find (same `activeSessionCutoffs`), and attempts older than the 15-minute window (`auth/login/attempt-window.ts`, shared with login) | A row goes the moment it can't be used, and the window can't differ between login and cleanup. Hourly on every server, unbatched: deleting twice is harmless and there is one owner's worth of rows | A leader or lock (coordination for nothing); batches (payments-sized tables only); a grace period |
| `API_BASE_URL` must be `https://` in production, except `localhost`, `127.0.0.1` and `[::1]`; the check lives in `validateApiBaseUrl`, called when `client.ts` loads | Admin tokens go in a header from the web server to the API; a plain-HTTP setting would send them readable. A startup error beats a silent leak. Same-machine http stays allowed for single-host setups | Always requiring https (breaks local `next start`); a note in the docs only |
| Drop `403` from the contract | A logged-in caller is always an admin | Keeping a response that can't happen |

## Follow-ups (not planned yet)

- Web login page (design decisions in [web.md](web.md)). Belongs with the web admin pages.
  - A server action stores the token in a `__Host-admin_session` cookie: `httpOnly; Secure; SameSite=Lax; Path=/`, with `Max-Age` matching `absoluteExpiresAt`. Logout deletes it with the same options it was set with (deleting by name alone drops `Secure`, and browsers then ignore it for a `__Host-` name).
  - Pass `Authorization` on each call (read from `cookies()`), never through shared module state; keep admin fetches uncached.
  - A `401` while a page renders only redirects to login, because cookies can't change during rendering; the stale cookie is replaced at the next login. A `401` inside an action may also delete the cookie.
  - The login page never redirects just because a cookie exists, or a stale cookie would loop between it and the admin pages.
  - Admin pages that fetch nothing (the new-course form) still call `requireAdminSession()`, because layouts don't re-run on navigation.
- Re-hash on login (`argon2.needsRehash`) once the Argon2 settings are raised.
- "Log out everywhere" and password change through the API.
