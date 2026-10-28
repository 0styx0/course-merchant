# API (NestJS)

Guidance for working in `api/`. Repo-wide rules are in the root [CLAUDE.md](../CLAUDE.md).

All routes are URI-versioned (`/v1/...`): controllers declare `version: "1"`, and `configure-app.ts` applies versioning plus the global error filter for both `main.ts` and e2e tests.

## API architecture

**Module/ESM conventions.** `"type": "module"` with `nodenext` resolution: relative imports need a `.js` suffix.
**Build.** `yarn build` runs `tsc-alias` after `nest build` to rewrite the `@/` imports in `dist/` (Nest's own rewriter can't see `.js` imports of `.ts` files); `nest start` skips it. `start:prod` runs `dist/src/main.js`, `dotenv` is a runtime dependency, and `src/test/` isn't compiled. Rejected: relative imports everywhere, an SWC builder, Node subpath imports.
**Layers.** controller → service → repository. Repositories are the only code touching the ORM; `StripeService` (`src/payments/`) is the only code touching the Stripe SDK (the SDK client is provided under the `STRIPE_CLIENT` token so tests can swap it).

**Database.** Prisma 8 RC, not the classic client. Its rules (fluent ORM idioms, migrations, `Temporal` timestamps, `DbScope` transactions) are in [api-database.md](../.claude/rules/api-database.md), which loads when you touch `src/prisma/`, `migrations/` or a repository.

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

## Tests

Test conventions are in [api-tests.md](../.claude/rules/api-tests.md) (loads when you touch a spec or `src/test/`).

Run one spec from `api/` (`yarn test:integration` / `test:e2e` start the test database and migrate it first; the single-spec form doesn't, so run `yarn db:test:up && yarn db:test:migrate` once):

- `yarn -s vitest run --config vitest.unit.config.ts <path>`
- `yarn -s vitest run --config vitest.integration.config.ts <path>`
- `yarn -s vitest run --config vitest.e2e.config.ts <path>`

## Moving and renaming files

Use `git mv`, then let `yarn tsc --noEmit` list the broken imports and fix those; don't `sed` across globs.
