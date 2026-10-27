# API (NestJS)

Guidance for working in `api/`. Repo-wide rules are in the root [CLAUDE.md](../CLAUDE.md).

All routes are URI-versioned (`/v1/...`): controllers declare `version: "1"`, and `configure-app.ts` applies versioning plus the global error filter for both `main.ts` and e2e tests.

## API architecture

**Module/ESM conventions.** `"type": "module"` with `nodenext` resolution: relative imports need a `.js` suffix.
**Build.** `yarn build` runs `tsc-alias` after `nest build` to rewrite the `@/` imports in `dist/` (Nest's own rewriter can't see `.js` imports of `.ts` files); `nest start` skips it. `start:prod` runs `dist/src/main.js`, `dotenv` is a runtime dependency, and `src/test/` isn't compiled. Rejected: relative imports everywhere, an SWC builder, Node subpath imports.
**Layers.** controller → service → repository. Repositories are the only code touching the ORM; `StripeService` (`src/payments/`) is the only code touching the Stripe SDK (the SDK client is provided under the `STRIPE_CLIENT` token so tests can swap it).

**Database (Prisma 8 RC — not the classic Prisma Client API).**
- Its docs ship in the package: `api/node_modules/@prisma/orm-postgres/skills/prisma-8/` (`SKILL.md`, `references/queries-postgres.md`, `migrations.md`, …). Read those instead of guessing from classic Prisma.
- Schema: `src/prisma/contract.prisma`. After editing it, `yarn contract:emit` regenerates `contract.json`/`contract.d.ts`; plan a migration with `yarn prisma migration plan` (packages land in `api/migrations/app/`), then apply with `yarn db:dev:migrate` / `yarn db:test:migrate`. `prisma-delete.sh` drops and re-inits both databases.
- **Migration trap:** the generated `migration.ts` imports `…/contract'` without a suffix; change it to `…/contract.js'` (nodenext). Self-emit (`node migration.ts`) works, so a migration with a hand-written data transform can be written and re-emitted.
- **Upgrading Prisma:** Follow `skills/prisma-8/references/upgrade-app.md` and run its per-step scripts from a copy outside `node_modules` (Node won't strip types there). Afterwards `contract:emit`, `prisma migration plan`, and `prisma db sign` each database (`--db <url>`; pass `--contract` if the schema also changed).
- Queries use the fluent ORM on `db.orm.public.<Model>` (`.where(c => c.field.eq(x))`, `.include`, `.select`, `.upsert`, `.first()`, `.all()`; combinators like `and` from `@prisma/orm-postgres/orm-client`).
- Idioms in use:
  - `createAndCount(rows, { onConflict: "skip", conflictOn: [...] })` for insert-if-absent (Postgres `ON CONFLICT DO NOTHING`). It returns how many rows were inserted, so 0 means the row already existed.
  - `.where(...).updateAndCount(...)` for guarded state changes. It returns how many rows changed: 1 means this call made the change, 0 means another caller already did or the condition didn't match. The condition is part of the `UPDATE` itself, so it's safe against races.
  - Don't use `.where(...).update(...)` for a guarded change. It returns the row or `null`, but it reads the row first and then updates it by id alone, so two callers can both pass the condition. Use it only for unconditional writes.
  - Don't catch driver errors by code.
- Timestamps are `Temporal.Instant` (`@js-temporal/polyfill`), not `Date`. The API only emits UTC instants ending in `Z`. The generated contract types name the global `Temporal` namespace, which TypeScript 5.9 lacks; [temporal-global.d.ts](src/temporal-global.d.ts) aliases it to the polyfill, otherwise every timestamp column is `any`. [temporal.ts](api/src/temporal.ts) sets the global `Temporal` to that same polyfill (first import in `main.ts` and the test setup), so the ORM, the app and the tests share one implementation. A time compared against a column Postgres fills in (`DEFAULT now()`) must come from `DatabaseClock` (`src/prisma/database-clock.ts`), not `Temporal.Now`: the database keeps microseconds and is one clock for every API server. The one exception is admin sessions and login attempts (see [docs/auth.md](../docs/auth.md)): their times are seconds-to-days long, so drift is accepted to save a query per admin request.
- Newer repositories (checkout, payments, email, enrollments) take a `scope: DbScope` (from `types.ts`) as their first argument — either `prisma.db` or the `tx` from `prisma.db.transaction(async (tx) => …)` — so the service owns the transaction and several repositories can write atomically. Never make network calls (e.g. Stripe) inside a transaction.

**Domain rules that span files.**
- Course status and price are append-only histories (`CourseStatus`, `CoursePrice`). A course is publicly visible when its *latest* status is `published` and some price has `effectiveAt <= now`; the current price is the latest effective one. This rule lives in `courses/course-visibility.ts` and is shared by browsing and checkout — reuse it, don't re-derive it.
- `Payment` copies amount/currency from the price at checkout start. An `Enrollment` is active only while `revokedAt` (refund) and `suspendedAt` (dispute) are both null. These are records that checkout, fulfillment and the owner act on: the API doesn't gate the emailed `contentUrl`, and the owner also sends paying customers a password. Granting and reactivating enrollments lives in `enrollments/enrollments.repository.ts`, shared by checkout and webhook fulfillment; `enrollments/enrollment-access.ts` classifies an enrollment.
- Stripe webhooks: `rawBody: true` is on app-wide (`main.ts`, `createE2eApp`) because signatures cover the exact bytes. `StripeService.verifyWebhookEvent` throws `InvalidWebhookSignatureError`, which `StripeWebhookController` (`src/webhooks/`) maps to 400. Only the webhook grants paid access, never the success redirect.
- Emails are queued in `EmailOutbox` in the same transaction as the change they describe; payloads hold IDs, not rendered content.
- Checkout responses deliberately don't reveal whether an email already owns a course (`check_email` for all non-redirect outcomes).

**Errors.** Responses are RFC 9457 `application/problem+json`, rendered by `common/errors/problem-details.filter.ts`.
- Throw `new ApiException(ErrorCode.X, { detail })`. Adding a code means adding it to an enum and to `ERROR_DEFINITIONS` in `error-codes.ts` (status + title), plus to the OpenAPI spec.
- Request bodies are validated by `ZodValidationPipe` with schemas under each module's `validation/`. Failures become `ValidationException` with one entry per field: `field` is a JSON Pointer, `code` is a `FieldErrorCode`. Custom refinements set the code via `params: { validationCode }`.
- Each module validates its own env settings with Zod at startup (`*-config.ts` beside the code that uses them), so a bad setting fails immediately.

**Tests.** Unit tests sit in `test/unit/` or beside the file; integration tests in `<module>/test/integration/`; e2e in `src/test/e2e/`.
- Unit tests build mocks with `MockMethods` and hand them over with `asDependency` (from `src/test/test-helpers.ts`), never a bare `as unknown as`; `fakePrisma({ onBegin, onCommit, onSettle })` stands in for `PrismaService` and records when transactions run. Use `vi.fn<Class["method"]>()` so canned values are checked against the real return type.
- Integration/e2e run serially and share `src/test/integration.setup.ts`, which wipes every table before each test in FK order — **add new tables there**.
- E2E builds the real app with `createE2eApp(overrides)` and hits it with supertest (`httpServer(app)` and `TypedResponse<Schema>` from `e2e-helpers.ts` keep `res.body` typed); pass `useStripeMock` / `useUnreachableStripe` (`src/test/e2e/stripe-mock.ts`) so the real SDK talks to stripe-mock. Shared fixtures are in `src/test/course-fixtures.ts`.

