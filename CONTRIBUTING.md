# Contributing

This guide covers how to make a change here: the workflow, tests, database changes and commits. To get the project running, see the [README](README.md#quick-start). For how the pieces fit together, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Before you start

- **Read the design doc for the area you're touching.** Each one records progress, why things are the way they are, and what was rejected:
  - [docs/payments.md](docs/payments.md) for checkout, webhooks, email and refunds;
  - [docs/courses.md](docs/courses.md) for creating, editing and browsing courses.
- **Two projects, one repo.** `api/` and `web/` each have their own `package.json` and lockfile. Run commands from inside a folder, or from the root with `yarn --cwd api …` / `yarn --cwd web …`. The root only holds the git hooks.
- **Two dependencies are newer than most guides cover:**
  - **Next.js 16** differs from older versions. Its docs ship in `web/node_modules/next/dist/docs/`.
  - **Prisma 8 (release candidate)** is not the classic Prisma Client API. Its docs ship in `api/node_modules/@prisma/orm-postgres/skills/prisma-8/`.

## Changing or adding an endpoint

The OpenAPI spec is the source of truth, so a change starts there:

```
1. Edit the contract        api/openapi/openapi-v1.yaml
        │
2. Regenerate types         yarn --cwd api generate:api-types
        │                   yarn --cwd web generate:api-types
        ▼
3. Implement                api: controller → service → repository
        │                   web: wrapper in src/features/<feature>/
        ▼
4. Test                     unit, then integration, then end-to-end
        │
        ▼
5. Update the docs          design doc status and decisions; README,
                            ARCHITECTURE and this file if affected
```

- **Never edit generated files** ([api.d.ts](api/src/generated/api.d.ts), [generated.ts](web/src/lib/api/generated.ts)). Both sides refer to the generated types through [api/types.ts](api/types.ts) and [web/src/lib/types.ts](web/src/lib/types.ts) instead of redefining them.
- **Adding an error code** takes three edits:
  1. add it to the enum;
  2. add it to `ERROR_DEFINITIONS` in [error-codes.ts](api/src/common/errors/error-codes.ts), with its HTTP status and title;
  3. add it to the OpenAPI spec.

  Throw it with `new ApiException(ErrorCode.X, { detail })`.
- **Adding a setting** means two things:
  - validate it with Zod in the `*-config.ts` file beside the code that uses it;
  - add it, with a comment, to [api/.env.example](api/.env.example), and to `api/.env.test` if tests need it.

## What the git hooks run

`yarn install` at the root installs the hooks through husky. Please don't skip them with `--no-verify`.

| Hook | Runs |
|---|---|
| `pre-commit` | ESLint and Prettier on staged files. Regenerates the API types (and Next's route types) and type-checks both projects. Runs unit tests for whichever project changed. |
| `pre-push` | Integration tests for the API, browser tests for the web app, then the API's end-to-end tests. Needs Docker running. |

## What CI runs

[ci.yml](.github/workflows/ci.yml) runs on every pull request and every push to `main`. It repeats everything the hooks run, on a clean machine, plus ESLint, Prettier's check, the API build, and a check that the generated API types are committed and up to date. The `api`, `web` and `web-playwright` jobs run in parallel; the Playwright tests have their own job so their browser install overlaps with the web checks. If CI fails but your hooks passed, run the failing command from the workflow locally. The usual causes are a forgotten `yarn generate:api-types` or a file that was never committed. CI uses no secrets: tests run against the fake values in `api/.env.test`.

## Writing tests

### API

| Kind | Where | How |
|---|---|---|
| Unit | `test/unit/` in the module, or beside the file | Build mocks with `MockMethods` and pass them in with `asDependency` from [test-helpers.ts](api/src/test/test-helpers.ts), never a bare `as unknown as`. Type mocks as `vi.fn<Class["method"]>()` so canned values are checked against the real return type. `fakePrisma()` stands in for the database and records when transactions run. |
| Integration | `<module>/test/integration/` | Runs against the test PostgreSQL. Tests run one at a time, and [integration.setup.ts](api/src/test/integration.setup.ts) empties every table before each test. **Add any new table there**, in foreign-key order. |
| End-to-end | [src/test/e2e/](api/src/test/e2e/) | Build the real app with `createE2eApp(overrides)` and call it with Supertest. `httpServer(app)` and `TypedResponse<Schema>` from [e2e-helpers.ts](api/src/test/e2e/e2e-helpers.ts) keep the response body typed. Use `useStripeMock` or `useUnreachableStripe` from [stripe-mock.ts](api/src/test/e2e/stripe-mock.ts). Shared test data is in [course-fixtures.ts](api/src/test/course-fixtures.ts). |

### Web

- **Unit tests target the pure `*-view.tsx` component**, with a hand-built `Result`. No network is needed.
- **MSW handlers** live in [src/mocks/handlers/](web/src/mocks/handlers/), one file per endpoint, typed from the generated contract. Each exports named scenarios (`success`, `notFound`, `error`, `slow`, …). In Vitest, a request with no handler fails the test.
- **Playwright tests** import `test` from `next/experimental/testmode/playwright/msw` and switch scenarios with `msw.use(...)`.
- **Sample courses** are in [src/mocks/fixtures/courses.ts](web/src/mocks/fixtures/courses.ts); handlers, Vitest and Playwright all import them. Handlers build problem+json answers with `problemResponse` from [problem-response.ts](web/src/mocks/problem-response.ts).
- **Playwright tests** (called browser tests) live in `web/tests/browser/` and run with `yarn --cwd web test:browser`.
- **To pick a scenario for `yarn dev:mock`**, edit [src/mocks/node.ts](web/src/mocks/node.ts). An endpoint without that scenario serves its `success` one.

## Changing the database schema

1. Edit [contract.prisma](api/src/prisma/contract.prisma).
2. Run `yarn --cwd api contract:emit` to regenerate the contract files.
3. Run `yarn --cwd api prisma migration plan`. A new folder appears in [api/migrations/app/](api/migrations/app/).
4. **Fix one import in the new `migration.ts`.** It imports `…/contract'` without a suffix. Change it to `…/contract.js'`, because the project uses Node's ESM resolution.
5. Apply it with `yarn --cwd api db:dev:migrate` and `yarn --cwd api db:test:migrate`.
6. If you added a table, add it to [integration.setup.ts](api/src/test/integration.setup.ts).

[api/prisma-delete.sh](api/prisma-delete.sh) drops and recreates both the development and test databases, for when you need a clean start.

## Code conventions

ESLint and Prettier handle formatting. The rest is up to you:

- **Imports in `api/` end in `.js`** (ESM with `nodenext` resolution), even when the file is `.ts`.
- **Respect the layers.** Only repositories use the database, and only `StripeService` uses the Stripe SDK. A service owns its transaction and passes it to repositories as their first argument (`scope`).
- **Guard state changes in the database.** Use `.where(…).updateAndCount(…)` and check that it returned 1. Don't use `.where(…).update(…)` for a conditional change: it reads first and then writes by id, so two callers can both pass the check. For insert-if-absent, use `createAndCount(rows, { onConflict: "skip", conflictOn: […] })`.
- **No Stripe or other network calls inside a transaction.**
- **Use only public, documented library APIs.** No undocumented error fields, private members, or packages you only get through another dependency. In particular, don't catch database errors by driver error code.
- **Use `Temporal.Instant` for timestamps**, not `Date`.
- **Write small functions.** A top-level method should read as a short list of well-named steps, with one method per outcome. A `switch` should only dispatch, one line per case.
- **Name things by their owner**: `customer.name`, not a bare `name` beside `courseId`.
- **Don't add abstractions for hypothetical needs.** A thin wrapper around an SDK is fine. An interface for a second payment provider that doesn't exist isn't.

## Dependency audit

Run `yarn --cwd api audit --groups dependencies` (and the same for `web`). Update to a patched version when the fix fits the existing version ranges. These advisories are known and accepted in `api/`, because nothing in them runs when a request reaches the API:

- **`multer`**, the 2.4.0 copy pinned by `@nestjs/platform-express`. It only runs through Nest's `FileInterceptor`, which the API doesn't use. The upload route uses the API's own direct `multer` dependency, kept on a patched release.
- **`hono`, `@hono/node-server`, `lodash`, `valibot`** under `prisma`. They belong to the Prisma command-line tool's local dev server and deploy tooling, which the running API never loads (it uses `@prisma/orm-postgres`). Pinned inside Prisma's pre-release packages; upgrade with Prisma.

## Commits

- **Use [Conventional Commits](https://www.conventionalcommits.org/) with a scope.** Examples:
  - `feat(checkout): …`
  - `fix(email): …`
  - `refactor(e2e): …`
  - `test(fixtures): …`
  - `docs: …`
- **One concern per commit.** Finish one change before starting the next.
- **Update the docs in the same commit as the code.** Tick the design doc's status, and add a decision row when something is decided. Record only what the code can't say (progress, reasons, rejected options), and never copy schemas or endpoint shapes into docs.

## Pull request checklist

- [ ] The OpenAPI spec was changed first, and types were regenerated on both sides.
- [ ] Type checks and all tests pass (the hooks run them).
- [ ] New behaviour has tests at the right level, and new tables are in `integration.setup.ts`.
- [ ] Security was considered:
  - input is validated;
  - nothing private (such as the course `contentUrl`) appears in public responses or logs;
  - no secrets are committed.
- [ ] Design docs are updated: status ticked, decisions recorded.
- [ ] README, ARCHITECTURE and CONTRIBUTING are updated if setup, commands, layout, module boundaries or major-feature status changed.

## Reporting a security issue

Please don't open a public issue. Contact the maintainer privately through their GitHub profile.
