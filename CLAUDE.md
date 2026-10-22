# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A small storefront for selling courses. Two independent yarn (v1) projects, each with its own `package.json`/`yarn.lock`; the root only holds husky git hooks.

- `api/` — NestJS 11 + Postgres via **Prisma 8 (RC)**, Stripe Checkout, Zod validation
- `web/` — **Next.js 16** (App Router, React 19), Tailwind 4, shadcn/base-ui. Read [web/AGENTS.md](web/AGENTS.md) first: this Next version differs from training data, and its docs live in `web/node_modules/next/dist/docs/`.

Product requirements are in `README.md`; UI behavior specs (Given/When/Then style) are in `web/docs/`.

## Design docs — read the matching one before working in an area

- [docs/payments.md](docs/payments.md) — checkout, webhooks, enrollments, refunds, emails: status checklist (what's next), flows, decisions with rejected alternatives, launch checklist.
- [docs/courses.md](docs/courses.md) — creating, editing and browsing courses: who sees what, `PUT` semantics, validation, decisions.

Update them in the same commit as the code they describe: tick status, add a decision row when something is decided. Record only what the code can't say (progress, why, what was rejected); never copy schemas or contract shapes into them.

## Commands

Run from the repo root with `yarn --cwd api …` / `yarn --cwd web …`, or from inside each package.

API (`api/`):
- `yarn start:dev` — dev server (needs `api/.env`, see `.env.example`; Postgres from root `docker-compose.yaml` on :5432)
- `yarn lint`, `yarn tsc --noEmit`
- `yarn test:unit` — `*.spec.ts`, excluding integration and e2e
- `yarn test:integration` — `*.integration.spec.ts` against the test DB (starts `docker-compose.test.yaml`: Postgres on :5433 + `stripe-mock` on :12111, then migrates)
- `yarn test:e2e` — `src/test/e2e/**` (same containers)
- Single test: `yarn vitest run --config vitest.unit.config.ts src/path/to/file.spec.ts` (swap in `vitest.integration.config.ts` / `vitest.e2e.config.ts`; run `yarn db:test:up && yarn db:test:migrate` first for those). The integration/e2e configs load `.env.test` themselves.

Web (`web/`):
- `yarn dev` (needs `API_BASE_URL`), or `yarn dev:mock` to run against MSW handlers instead of the API
- `yarn lint`, `yarn tsc --noEmit`
- `yarn test:unit` — Vitest + jsdom + Testing Library; single file: `yarn vitest run src/path/to/file.test.tsx`
- `yarn test:integration` — Playwright (boots `next dev` with `PLAYWRIGHT=1`); single file: `yarn playwright test tests/integration/courses/course.get.spec.ts`

Linting and formatting: ESLint (`yarn lint`, errors fail) then Prettier with a per-package `.prettierrc` (2 spaces; otherwise Prettier defaults). `yarn format` / `yarn format:check` in each package; markdown and generated files are ignored (`.prettierignore`).

Git hooks (`.husky/`): **pre-commit** lints (`eslint --fix`) and formats staged files via lint-staged, then regenerates API types in both packages, type-checks both, and runs unit tests for whichever package has staged changes. **pre-push** runs API integration + e2e and web Playwright tests (needs Docker).

## Contract-first API

`api/openapi/openapi-v1.yaml` is the source of truth for every endpoint, request/response shape and error code. Change it first, then regenerate:

- `yarn --cwd api generate:api-types` → `api/src/generated/api.d.ts`
- `yarn --cwd web generate:api-types` → `web/src/lib/api/generated.ts`

Never hand-edit generated files. Both sides alias the generated schemas rather than redefining them: `api/types.ts` (imported as `"types.js"`) and `web/src/lib/types.ts`.

All routes are URI-versioned (`/v1/...`): controllers declare `version: "1"`, and `configure-app.ts` applies versioning plus the global error filter for both `main.ts` and e2e tests.

## API architecture

**Module/ESM conventions.** `"type": "module"` with `nodenext` resolution: relative imports need a `.js` suffix. `@/…` maps to `api/src/…`. Every Nest constructor parameter uses an explicit `@Inject(Token)` — keep doing this; tests run through Vite/Vitest, which doesn't emit decorator metadata.

**Layers.** controller → service → repository. Repositories are the only code touching the ORM; `StripeService` (`src/payments/`) is the only code touching the Stripe SDK (the SDK client is provided under the `STRIPE_CLIENT` token so tests can swap it).

**Database (Prisma 8 RC — not the classic Prisma Client API).**
- Its docs ship in the package: `api/node_modules/@prisma/orm-postgres/skills/prisma-8/` (`SKILL.md`, `references/queries-postgres.md`, `migrations.md`, …). Read those instead of guessing from classic Prisma.
- Schema: `src/prisma/contract.prisma`. After editing it, `yarn contract:emit` regenerates `contract.json`/`contract.d.ts`; plan a migration with `yarn prisma migration plan` (packages land in `api/migrations/app/`), then apply with `yarn db:dev:migrate` / `yarn db:test:migrate`. `prisma-delete.sh` drops and re-inits both databases.
- **Migration trap:** the generated `migration.ts` imports `…/contract'` without a suffix; change it to `…/contract.js'` (nodenext). Self-emit (`node migration.ts`) is broken here by a `@prisma/cli-engine` version mismatch ("does not provide an export named 'configSchema'"), so a migration that needs a hand-written data transform needs that fixed first; plain planned migrations don't.
- Queries use the fluent ORM on `db.orm.public.<Model>` (`.where(c => c.field.eq(x))`, `.include`, `.select`, `.upsert`, `.first()`, `.all()`; combinators like `and` from `@prisma/orm-postgres/orm-client`).
- Idioms in use: `createAndCount(rows, { onConflict: "skip", conflictOn: [...] })` for insert-if-absent (Postgres `ON CONFLICT DO NOTHING`; 0 means it already existed); `.where(...).update(...)` returns the row or `null`, which makes forward-only state changes safe against races. Don't catch driver errors by code.
- Timestamps are `Temporal.Instant` (`@js-temporal/polyfill`), not `Date`. The API only emits UTC instants ending in `Z`. The generated contract types name the global `Temporal` namespace, which TypeScript 5.9 lacks; [temporal-global.d.ts](api/src/temporal-global.d.ts) aliases it to the polyfill, otherwise every timestamp column is `any`.
- Newer repositories (checkout, email, enrollments) take a `scope: DbScope` (from `types.ts`) as their first argument — either `prisma.db` or the `tx` from `prisma.db.transaction(async (tx) => …)` — so the service owns the transaction and several repositories can write atomically. Never make network calls (e.g. Stripe) inside a transaction.

**Domain rules that span files.**
- Course status and price are append-only histories (`CourseStatus`, `CoursePrice`). A course is publicly visible when its *latest* status is `published` and some price has `effectiveAt <= now`; the current price is the latest effective one. This rule lives in `courses/course-visibility.ts` and is shared by browsing and checkout — reuse it, don't re-derive it.
- `Payment` copies amount/currency from the price at checkout start. `Enrollment` grants access only while `revokedAt` (refund) and `suspendedAt` (dispute) are both null. Granting and reactivating access lives in `enrollments/enrollments.repository.ts`, shared by checkout and webhook fulfillment; `enrollments/enrollment-access.ts` classifies an enrollment.
- Stripe webhooks: `rawBody: true` is on app-wide (`main.ts`, `createE2eApp`) because signatures cover the exact bytes. `StripeService.verifyWebhookEvent` throws `InvalidWebhookSignatureError`, which the webhook controller (not built yet, see `docs/payments.md`) maps to 400. Only the webhook grants paid access, never the success redirect.
- Emails are queued in `EmailOutbox` in the same transaction as the change they describe; payloads hold IDs, not rendered content.
- Checkout responses deliberately don't reveal whether an email already owns a course (`check_email` for all non-redirect outcomes).

**Errors.** Responses are RFC 9457 `application/problem+json`, rendered by `common/errors/problem-details.filter.ts`.
- Throw `new ApiException(ErrorCode.X, { detail })`. Adding a code means adding it to an enum and to `ERROR_DEFINITIONS` in `error-codes.ts` (status + title), plus to the OpenAPI spec.
- Request bodies are validated by `ZodValidationPipe` with schemas under each module's `validation/`. Failures become `ValidationException` with one entry per field: `field` is a JSON Pointer, `code` is a `FieldErrorCode`. Custom refinements set the code via `params: { validationCode }`.
- Env config is Zod-validated once at startup (`src/config/`), so a bad setting fails immediately.

**Tests.** Unit tests sit in `test/unit/` or beside the file; integration tests in `<module>/test/integration/`; e2e in `src/test/e2e/`.
- Integration/e2e run serially and share `src/test/integration.setup.ts`, which wipes every table before each test in FK order — **add new tables there**.
- E2E builds the real app with `createE2eApp(overrides)` and hits it with supertest (`httpServer(app)` and `TypedResponse<Schema>` from `e2e-helpers.ts` keep `res.body` typed); pass `useStripeMock` / `useUnreachableStripe` (`src/test/e2e/stripe-mock.ts`) so the real SDK talks to stripe-mock. Shared fixtures are in `src/test/course-fixtures.ts`.

## Web architecture

- Data is fetched only server-side through `src/lib/api/client.ts` (`openapi-fetch` typed by `generated.ts`, `server-only`). Each endpoint gets a wrapper in `src/lib/api/` that returns `Result<T, ProblemDetails>` (`state: "success" | "failure"`) instead of throwing.
- Components are split into an async server container that fetches (e.g. `courses.tsx`) and a pure `*-view.tsx` that renders a `Result`. Unit tests target the view with a hand-built `Result`.
- MSW handlers in `src/mocks/handlers/` (one file per endpoint, typed from `operations[...]`) export named scenarios (`success`, `notFound`, `error`, `slow`, …). They serve three purposes:
  - Vitest — `src/test/setup.ts`; unhandled requests fail the test.
  - `yarn dev:mock` — via `src/instrumentation.ts`; choose the scenario in `src/mocks/node.ts`.
  - Playwright — via Next's experimental test proxy: import `test` from `next/experimental/testmode/playwright/msw` and switch scenarios with `msw.use(...)`.

## Conventions

- Conventional commit messages with scopes, e.g. `feat(checkout): …`, `refactor(e2e): …`, `test(fixtures): …`.
- `ignore.md` at the root is a gitignored scratch file, not documentation.

## Working agreements

How the owner wants Claude to work on this repo:

- **One commit at a time.** Before coding a commit, give a detailed outline (what, why, trade-offs) and wait for the go-ahead. Then implement, verify (type check and the relevant tests), and stop with a suggested conventional commit message. The owner makes the commits. Finish one commit's changes before starting the next: interactive `git add -p` isn't available, so mixed hunks can't be split.
- **Ask before any design or behaviour change**, however small, even inside an approved refactor. Mentioning it afterwards isn't enough.
- **Questions aren't instructions.** Answer them and stop; offer any resulting change as an option.
- **Public library APIs only**, in code and tests: no undocumented error fields (e.g. `sqlState`), transitive-only exports or private members. If the public API can't do it, say so and suggest alternatives.
- **Modular, not speculative.** Give real responsibilities and shared logic their own focused module, but add no interfaces or abstractions for hypothetical needs (e.g. no payment gateway interface). Put flexibility where change is expensive: the DB schema. A thin concrete wrapper around an SDK is fine.
- **Small composed functions.** A top-level method reads as a short orchestration of well-named steps, one method per outcome; a switch is only a thin dispatch with one line per case.
- **Unambiguous labels.** Nest or qualify fields by owner (`customer.name`, not `name` beside `courseId`), in contracts, types and variables.
- **Link files.** Any list of files is markdown links relative to the repo root, e.g. `[types.ts](api/types.ts)`.
- **Keep the design docs current** in the same commit (see *Design docs*).
- **Usage reviews.** At a natural pause (a step in a design doc's Status just finished, nothing complex in flight), review how the owner is using Claude and give a few tips, most impactful first. Give each a before/after for efficiency (context tokens per call, calls per commit) and quality (correction rounds per commit). Measure "before" from the session transcript's `usage` fields (`~/.claude/projects/<project>/<session>.jsonl`) and label anything else as an estimate.
