# Review follow-ups

Fixes and refactors decided in the architecture review of 2026-10-23. Each item is one commit, and its decisions are already made, so the `/next-commit` outline only has to settle the details it names. Items are ordered by impact: correctness first, then refactors.

This file is temporary. When an item ships, tick it and move its decision rows into the area doc it belongs to ([payments.md](payments.md) or [courses.md](courses.md)). When the last item ships, delete this file, remove it from CLAUDE.md, and mark [payments.md](payments.md) step 5 (Sweeper) **Next**.

## Status

- [x] **R1. Split `payments.md` by subarea.**
  - [payments.md](payments.md) keeps Status, Principles and the launch checklist, so `/next-commit` still finds it.
  - Flows and decisions move to `docs/payments/checkout.md`, `fulfillment.md`, `email.md` and `refunds.md` (refunds, disputes and the sweeper).
  - Text moves unchanged, except for cutting rows the code already states plainly (for example "`rawBody: true` app-wide", which [main.ts](../api/src/main.ts) explains).
  - Update the pointer in CLAUDE.md.

  *Why:* the file is about 20 KB, the same as [checkout.service.ts](../api/src/checkout/checkout.service.ts) and [fulfillment.service.ts](../api/src/payments/fulfillment.service.ts) together. An email-only task needs about 10 of its 47 decision rows.
- [x] **R2. Use one Temporal implementation in production and in tests.**
  - Move `@js-temporal/polyfill` from `devDependencies` to `dependencies`: 22 runtime files import it, so a production-only install can't start the app.
  - Add `src/temporal.ts`, which sets `globalThis.Temporal`, and import it first in [main.ts](../api/src/main.ts) and in [integration.setup.ts](../api/src/test/integration.setup.ts).
  - `temporal-polyfill` stays: `@prisma/orm-postgres` lists it as a peer dependency and imports it, so removing it breaks the install. The ORM uses it only when no global `Temporal` exists, which was production only before this change.

  *Verified:* a production-only install resolves `@js-temporal/polyfill`. A full boot was blocked by other problems, which R2a fixed.
- [x] **R2a. Make the production build start.**
  - Found while verifying R2: a production-only install of `yarn build` output couldn't boot, for three separate reasons, all fixed in [package.json](../api/package.json) and [tsconfig.build.json](../api/tsconfig.build.json).
  - `dotenv` moved to `dependencies`: [db.ts](../api/src/prisma/db.ts) and the config files import it at runtime.
  - `build` runs `tsc-alias` after `nest build`, which rewrites the `@/…` imports in `dist/` to relative paths.
  - `start:prod` runs `node dist/src/main.js`.
  - `src/test/` is no longer compiled into `dist/`.

  *Verified:* build, production-only install in a scratch directory, boot with the `.env.test` settings, and `GET /v1/courses` answered 200.
- [x] **R3. Make reactivating a refunded enrollment safe against races.**
  - In `grantAccess` ([enrollments.repository.ts](../api/src/enrollments/enrollments.repository.ts)), replace `.update` with `updateAndCount` (same filter), and return the enrollment's id only when the count is 1.
  - Fix the comment that claims `.update` already stops a concurrent reactivation.
  - Add a concurrency integration test: two `grantAccess` calls on one revoked enrollment, run together. Exactly one returns an id.

  *Why:* `.update` reads the row, then updates it by id alone, so both calls can reactivate it. The buyer then gets two access emails, and `paymentId` silently points at whichever payment wrote last.

  *Verified:* the new test failed against the old `.update` in 8 of 8 runs (both calls returned the id) and passes with `updateAndCount`. After a count of 1, the id is read back with `findEnrollment`, since `updateAndCount` returns only the count.
- [ ] **R4. Remove the customer's name from buyer emails.** **Next**
  - `access_granted`, `already_owned` and `access_suspended` no longer greet by name. For example, "You now have access to {course}." replaces "Hi {name}, you now have access…". The exact wording goes in the outline.
  - The name is still stored and shown in the admin view.

  *Why:* anyone can start a checkout for any address with any name, and the first name given is kept. The name is therefore text chosen by a stranger, in mail sent from the shop's domain, and it can be planted before the real owner of the address ever buys.
- [ ] **R5. Refund a suspended buyer's payment straight away.**
  - When fulfillment finds a suspended enrollment, it refunds the payment after commit, as it does for a double purchase. Generalise `refundDoublePurchase` and its next step to "refund after commit", carrying the cause.
  - The `access_suspended` payload gains `refundIssued` (checkout passes `false`), and the email tells the buyer a refund is on its way.
  - The refund sends no Stripe `reason`, because none of `duplicate`, `fraudulent` and `requested_by_customer` fits. It carries `metadata.paymentId` and a `refundCause`.
  - Add a decision row.

  *Why:* today the payment is marked succeeded and nothing refunds it until the sweeper exists, and nothing records that as intended.
- [ ] **R6. Count only active enrollments in the public `enrollmentCount`.**
  - Filter on `revokedAt` and `suspendedAt` both null.
  - Update the field's description in the contract and regenerate both type files.
  - Decision row: the admin list keeps returning every enrollment of every course, because there are few enrollments per course.
- [ ] **R7. Stop two running copies of the API from sending the same email.**
  - [main.ts](../api/src/main.ts) calls `enableShutdownHooks()`, so Nest runs its shutdown steps (closing the database, stopping the worker) on SIGTERM.
  - `EmailWorker` implements `OnApplicationShutdown`: it stops starting runs and waits for the current one to finish.
  - Before sending, the worker claims each email: an `updateAndCount` moves `nextAttemptAt` 10 minutes ahead, on condition that `status` is `pending` and `nextAttemptAt` still equals the value it read. A count of 0 means another copy claimed it, so this one skips it. A failed attempt then sets `nextAttemptAt` from the retry policy as before.
  - Set nodemailer's timeouts to 30 s to connect, 30 s for the greeting and 60 s of socket inactivity. The defaults (2 minutes, 30 s, 10 minutes) would let a send outlast its claim, so another copy could claim and send the same email. With these timeouts a send ends within about 2 minutes, so the 10-minute claim leaves margin, and an email whose sender crashed is retried 10 minutes later.
  - Replace the "No lease on emails being sent" decision row.

  *Why:* most hosts run the old and new copy side by side for a few seconds to a minute during every zero-downtime deploy, so "one process" doesn't hold.
- [ ] **R8. Check each email's payload when the worker reads it back.**
  - One Zod schema per `EmailKind`, and `EmailPayloads` derived from them with `z.infer`.
  - [email-composer.ts](../api/src/email/email-composer.ts) parses the payload instead of casting it. A payload that doesn't parse is a failed attempt, like a missing row.

  *Why:* queued rows outlive deploys, so a row written under an older payload shape would otherwise render `undefined` or throw inside a template.
- [ ] **R9. Pin the Stripe API version.**
  - Set `apiVersion` in `stripeClientProvider` ([stripe.service.ts](../api/src/payments/stripe.service.ts)) to the version the SDK is typed for (`2026-09-30.endive` in stripe 23.0.0).
  - Launch checklist: create the production webhook endpoint with the same API version.

  *Why:* webhook payloads follow the endpoint's API version. If it differs from the SDK's, events no longer match the SDK's types, and nothing at compile time notices.
- [ ] **R10. Validate every setting at startup, inside the module that uses it.**
  - `DATABASE_URL` gets a Zod loader beside [db.ts](../api/src/prisma/db.ts). Today a missing value fails at the first query, not at startup.
  - `PORT` gets one beside [main.ts](../api/src/main.ts).
  - The `ALLOWED_CURRENCIES` parser moves into the courses module, its only user.
  - `payments-config.ts` and `email-config.ts` move from `src/config/` into `payments/` and `email/`.

  The outline flags anything that turns out to be more than a file move.
- [ ] **R11. Keep every `Payment` write in `PaymentsRepository`.**
  - Move `createPendingPayment`, `saveProviderCheckoutId` and `findPaymentStatusByCheckoutId` from [checkout.repository.ts](../api/src/checkout/checkout.repository.ts) to [payments.repository.ts](../api/src/payments/payments.repository.ts). `CheckoutRepository` keeps the course lookup and customers.
  - Their tests move with them.

  *Why:* "what changes a payment's state?" then has a one-file answer.
- [ ] **R12. Put shared code where a search would find it.**
  - `ZodValidationPipe` and `toJsonPointer` move from `courses/pipes/create-course-validation.pipe.ts` to `common/validation/zod-validation.pipe.ts`.
  - `CompletedCheckout` and `ExpiredCheckout` move to `payments/checkout-events.ts`, and the Stripe event mappers to `payments/stripe-events.ts`. This removes the type-import cycle between `stripe.service.ts` and `fulfillment.service.ts`.
  - Error-code enums are named by domain (`ErrorCodeCourse`, …), not by operation (`ErrorCodeCourseGet`).
  - Remove the unused `TOO_MANY_REQUESTS` from the contract and the code, regenerate both type files, and update the launch-checklist line that mentions it.
- [ ] **R13. Course repositories take a `DbScope`.** `CoursesRepository` and `AdminCoursesRepository` follow the newer repositories: stateless, with the service owning the transaction.
- [ ] **R14. Give a course's latest status one definition.**
  - Export `latestStatusIs(name)` and `latestStatusIsNot(name)` from [course-visibility.ts](../api/src/courses/course-visibility.ts), and use them in the public and admin queries. Today "latest status" is worked out in 3 places.
  - Add `@@unique([courseId, changedAt])` on `CourseStatus`, with a migration.
  - Move the decision row below into [courses.md](courses.md).

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| The review's follow-ups live in this temporary doc, one commit per item | The items span payments, courses, email and infrastructure. Spreading them across the area docs would mean several **Next** markers, which `/next-commit` refuses | Adding them to `payments.md` and `courses.md`; implementing them all in one session |
| A course's latest status stays computed from the `CourseStatus` log, through one shared helper, with `@@unique([courseId, changedAt])` | No second copy of the status to keep in step. The query is cheap at this shop's size. The constraint closes the one real gap: two statuses with the same `changedAt` (Postgres's `now()` is fixed for a whole transaction) would both count as latest, so a deleted course could show as published. It's the same pattern as `CoursePrice`'s `@@unique([courseId, effectiveAt])` | A `Course.currentStatus` column written beside each log row (duplicated state that can drift, plus a migration and backfill); a tie-breaking sequence column |
| `tsc-alias` after `nest build` rewrites the `@/` aliases; `start:prod` uses `dist/src/main.js`; `dotenv` is a runtime dependency; `src/test/` isn't compiled | Nest's own alias rewriter can't see `.js` imports of `.ts` files, so the aliases stayed in `dist/`. One script line and one devDependency keep the `@/` convention. `nest start` doesn't run `tsc-alias`, so it isn't covered. The compile root includes [types.ts](../api/types.ts) and the migrations, so the entry stays under `dist/src/` | Relative imports everywhere (about 171 imports in 66 files); an SWC builder; Node subpath imports (`#/…`); dropping the `dotenv` imports (changes how local runs load `.env`) |
