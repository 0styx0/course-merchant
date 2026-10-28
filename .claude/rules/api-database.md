---
paths:
  - "api/src/prisma/**"
  - "api/migrations/**"
  - "api/src/**/*.repository.ts"
  - "api/src/**/*.repository/**"
  - "api/src/temporal*.ts"
---

# API database (Prisma 8 RC — not the classic Prisma Client API)

- Its docs ship in the package: `api/node_modules/@prisma/orm-postgres/skills/prisma-8/` (`SKILL.md`, `references/queries-postgres.md`, `migrations.md`, …). Read those instead of guessing from classic Prisma.
- Schema: `src/prisma/contract.prisma`. After editing it, `yarn contract:emit` regenerates `contract.json`/`contract.d.ts`; plan a migration with `yarn prisma migration plan` (packages land in `api/migrations/app/`), then apply with `yarn db:dev:migrate` / `yarn db:test:migrate`. `prisma-delete.sh` drops and re-inits both databases.
- **Migration trap:** the generated `migration.ts` imports `…/contract'` without a suffix; change it to `…/contract.js'` (nodenext). Self-emit (`node migration.ts`) works, so a migration with a hand-written data transform can be written and re-emitted.
- **Upgrading Prisma:** follow `skills/prisma-8/references/upgrade-app.md` and run its per-step scripts from a copy outside `node_modules` (Node won't strip types there). Afterwards `contract:emit`, `prisma migration plan`, and `prisma db sign` each database (`--db <url>`; pass `--contract` if the schema also changed).
- Queries use the fluent ORM on `db.orm.public.<Model>` (`.where(c => c.field.eq(x))`, `.include`, `.select`, `.upsert`, `.first()`, `.all()`; combinators like `and` from `@prisma/orm-postgres/orm-client`).
- Idioms in use:
  - `createAndCount(rows, { onConflict: "skip", conflictOn: [...] })` for insert-if-absent (Postgres `ON CONFLICT DO NOTHING`). It returns how many rows were inserted, so 0 means the row already existed.
  - `.where(...).updateAndCount(...)` for guarded state changes. It returns how many rows changed: 1 means this call made the change, 0 means another caller already did or the condition didn't match. The condition is part of the `UPDATE` itself, so it's safe against races.
  - Don't use `.where(...).update(...)` for a guarded change. It returns the row or `null`, but it reads the row first and then updates it by id alone, so two callers can both pass the condition. Use it only for unconditional writes.
  - Don't catch driver errors by code.
- Timestamps are `Temporal.Instant` (`@js-temporal/polyfill`), not `Date`. The API only emits UTC instants ending in `Z`. The generated contract types name the global `Temporal` namespace, which TypeScript 5.9 lacks; [temporal-global.d.ts](../../api/src/temporal-global.d.ts) aliases it to the polyfill, otherwise every timestamp column is `any`. [temporal.ts](../../api/src/temporal.ts) sets the global `Temporal` to that same polyfill (first import in `main.ts` and the test setup), so the ORM, the app and the tests share one implementation. A time compared against a column Postgres fills in (`DEFAULT now()`) must come from `DatabaseClock` (`src/prisma/database-clock.ts`), not `Temporal.Now`: the database keeps microseconds and is one clock for every API server. The one exception is admin sessions and login attempts (see [docs/auth.md](../../docs/auth.md)): their times are seconds-to-days long, so drift is accepted to save a query per admin request.
- Newer repositories (checkout, payments, email, enrollments) take a `scope: DbScope` (from `types.ts`) as their first argument — either `prisma.db` or the `tx` from `prisma.db.transaction(async (tx) => …)` — so the service owns the transaction and several repositories can write atomically. Never make network calls (e.g. Stripe) inside a transaction.
