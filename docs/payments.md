# Payments

Read this before working on checkout, webhooks, enrollments, refunds or the email outbox. It records what the code can't tell you: progress, design intent, and why each choice was made. Shapes live elsewhere and aren't repeated here: the schema is in [contract.prisma](../api/src/prisma/contract.prisma), and endpoints and error codes are in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml).

Keep these files current **in the same commit as the work**. Tick off status here, add a decision row to the matching subarea doc (see *Subarea docs*) when something is decided, and when a step ships, cut its design notes down to decision rows.

## Status

- [x] **1. Schema:**
  - provider-agnostic `Payment` with a nullable `paidAt`;
  - `Enrollment.revokedAt` and `suspendedAt`;
  - `EmailOutbox`;
  - private `Course.contentUrl`;
  - currency allow-list.
- [x] **2. Checkout:**
  - `POST /v1/checkout-sessions`: free enrollment, already-owned handling, paid redirect;
  - `GET /v1/checkout-sessions/{id}` status;
  - `StripeService.createCheckoutSession`;
  - email queueing.
- [x] **3. Webhooks and fulfillment:**
  - [x] contract entry for `POST /v1/webhooks/stripe`;
  - [x] signing secret and `rawBody`;
  - [x] `StripeService.verifyWebhookEvent`;
  - [x] `EnrollmentsRepository`, shared by checkout and fulfillment.
  - [x] `PaymentsRepository`: owns every `Payment` read and write: creating pending payments, saving the checkout id, event dedupe, lookup by our payment id, and guarded `pending →` transitions.
  - [x] `FulfillmentService` for `checkout.session.completed`, with `completedCheckoutFromEvent` reading Stripe's event in our terms.
  - [x] `StripeService.refundPayment`, called by `FulfillmentService.fulfillCheckout` after the database transaction is saved for a double purchase or a suspended buyer.
  - [x] `ExpiryService` for `checkout.session.expired`, with `expiredCheckoutFromEvent` beside the completed mapper.
  - [x] `StripeWebhookController` in `WebhooksModule`: verifies the signature, dispatches `completed` and `expired`, acknowledges other types.

  The manual `stripe listen` check is deferred to the *Launch* checklist, to run through the web checkout once step 6 exists.
- [x] **4. Email delivery:**
  - [x] `EmailOutboxRepository.findDue`, `markSent` and `markFailedAttempt`, with the backoff in `email/delivery/retry-policy.ts`.
  - [x] Templates for each `EmailKind` and `EmailSender` over SMTP.
  - [x] `EmailWorker` on a `@nestjs/schedule` interval, with `EmailComposer` loading each email's course, customer or payment (via `EmailViewsRepository`) and rendering it.
  - [x] Admin course view shows each enrollment's `emailStatus`, the only alert for a failed email.
- [x] **5. Sweeper** (see [refunds.md](payments/refunds.md)):
  - [x] `PaymentRefunds` refunds through Stripe, then marks the payment `refunded`; fulfillment and the sweeper both use it.
  - [x] `PaymentSweeper` on a 10-minute interval: refunds orphan payments, rechecks overdue pending payments with Stripe, expires payments with no checkout.
  - [x] `StripeService.retrieveCheckout`, `refundPayment` treating `charge_already_refunded` as success, and `FulfillmentService.fulfillRetrievedCheckout`.
- [x] **6. Web:** planned and built in [course-page.md](course-page.md) (milestones 2 to 5); the bullets below stay as the requirements (structure and decisions in [web.md](web.md))
  - buy form on the course page: a Server Action with `useActionState`; `lib/api/form-errors.ts` (API field errors to form fields) arrives here;
  - `/checkout/success`, rendered on the server and refreshed with `router.refresh()` while the status is `pending`;
  - no cancel page: Stripe's cancel URL is the course page ([stripe-redirect.service.ts](../api/src/checkout/stripe-redirect.service.ts));
  - MSW handlers.

  Write the Given/When/Then specs first, in the step text here.
- [ ] **7. Refunds and disputes by hand, API side** (see [refunds.md](payments/refunds.md)). The students list, its Un-enroll button and the "Refund owed" mark are web work, planned in the admin course view area of [courses.md](courses.md).
  - [x] **7a.** The admin course answers say which students are owed a refund, so a refund that Stripe keeps refusing shows up without reading logs.
  - [ ] **7b.** The API can un-enroll a student in one transaction: it revokes the enrollment and records the payment as refunded. Nothing calls this yet; 7d does. **Next**
    - *Behaviours*:
      - An active paid enrollment gets `revokedAt` set to the database time, and its payment goes from `succeeded` to `refunded`, with `refundedAt` set.
      - A free enrollment (no payment) gets only `revokedAt`.
      - An enrollment that's already revoked doesn't change, keeps its first `revokedAt`, and the call reports success.
      - A missing enrollment reports "not found".
      - The service reads `paymentId`, then runs a guarded update on `revokedAt IS NULL AND paymentId = <read>`. A count of 0 means it was already revoked, so nothing is refunded.
      - A payment that isn't `succeeded` stays as it is, and the revocation still saves.
      - If the second write fails, the first one rolls back.
    - *New shared pieces*: none.
    - *Files*:
      - `api/src/enrollments/enrollments.repository.ts`
      - `api/src/admin-enrollments/admin-enrollments.service.ts` (new; reuses `markPaymentRefunded`)
      - `api/src/prisma/contract.prisma` (comment: the admin's un-enroll sets `revokedAt`)
    - *Settled*: the refunds.md row on un-enroll.
    - *Done when*: the service unit tests and the repository and service integration tests pass.
  - [ ] **7c.** Course ids and customer ids in URLs are checked by one shared rule. *(mechanical)*
    - *New shared pieces*: a uuid pipe that takes the error code, because 7d needs a second id check.
    - *Files*:
      - `ParseCourseIdPipe` moves to `api/src/common/validation/`.
      - Its 3 calling controllers change.
    - *Done when*: the existing unit and e2e tests pass unchanged, and the e2e tests that pin the 400 `INVALID_COURSE_ID` pass (coverage check first).
  - [ ] **7d.** The admin can un-enroll a student through the API.
    - *Behaviours*:
      - `POST /v1/admin/courses/{courseId}/enrollments/{customerId}/revocation` returns 204.
      - A repeat call returns 204 and changes nothing.
      - An unknown course, customer or enrollment returns 404 `ENROLLMENT_NOT_FOUND`.
      - A malformed course id returns 400 `INVALID_COURSE_ID`.
      - A malformed customer id returns 400 `INVALID_CUSTOMER_ID`.
      - A call without an admin session returns 401, and the route-coverage test lists the route.
      - The contract's `revokedAt` description names the un-enroll.
    - *New shared pieces*: the `ENROLLMENT_NOT_FOUND` and `INVALID_CUSTOMER_ID` codes, because the web will word them.
    - *Files*:
      - `api/openapi/openapi-v1.yaml`
      - `api/src/common/errors/error-codes.ts`
      - `api/src/admin-enrollments/admin-enrollments.controller.ts` (new)
      - `api/src/admin-enrollments/admin-enrollments.module.ts` (new; imports Prisma, Enrollments and Payments, as Checkout does)
      - `api/src/app.module.ts`
    - *Needs*: 7b and 7c.
    - *Done when*: the controller unit tests pass, and the e2e tests cover 204, the repeat, 404, both 400s and 401.
  - [ ] **7e.** The unused dispute alert email is gone from the code and the database. *(mechanical)*
    - *New shared pieces*: none.
    - *Files*:
      - `api/src/prisma/contract.prisma`, plus a planned migration
      - `api/src/email/outbox/email-payloads.ts`
      - `api/src/email/outbox/email-outbox.repository.ts`
      - `api/src/email/outbox/email-views.repository.ts`
      - `api/src/email/email-composer.ts`
      - `api/src/email/templates/email-templates.ts`
      - `api/src/email/templates/render-email.ts`
      - the 5 specs that use the kind
    - *Done when*: `grep -rn dispute_alert api/src` finds only old migrations.
- [ ] **8. Estimated payout on the admin price field.** Planned later, with the Stripe fee formula settled first. Its line in [courses.md](courses.md) points here.
- [ ] **Launch:** see the checklist at the end.

## Principles

- **Stripe is the system of record for money.** The app stores only what it needs to grant access. The accountant works from Stripe's free Dashboard reports.
- **No monthly fees:**
  - hosted Checkout in one-time `payment` mode, card only;
  - prices sent inline (`price_data`), with no Stripe Products, Prices or Customers to keep in sync;
  - Stripe Tax, Billing, Invoicing and Radar for Fraud Teams stay off.

  Free courses (price 0) never touch Stripe.
- **Provider portability lives in the schema, not the code.** Every payment records its `provider`, and the `provider*` columns are generic. `StripeService` is a thin concrete wrapper with no gateway interface. Add one only when a second provider actually exists.
- **No network calls inside a DB transaction.** The service owns the transaction, and repositories take a `DbScope`. Stripe calls happen before the transaction starts or after its changes are saved.
- **State only moves forward:**
  - payments go `pending` to `succeeded` or `expired`, and `succeeded` to `refunded`;
  - every transition is a conditional update, so a duplicate or out-of-order delivery changes nothing.
- **Each module validates its own settings at startup.** A `*-config.ts` beside the code that uses a setting checks it with Zod and throws, naming the variable but never echoing its value. There is no shared config folder or schema.

## Subarea docs

Flows and decisions, one file per subarea. Read the one that matches the task:

- [checkout.md](payments/checkout.md) — starting a checkout: already-owned handling, the email cap, currencies.
- [fulfillment.md](payments/fulfillment.md) — the Stripe webhook, fulfillment, expiry and the double-purchase refund.
- [email.md](payments/email.md) — the outbox, worker, retries, templates and sender.
- [refunds.md](payments/refunds.md) — refunds, disputes, access and the sweeper.

## Launch checklist

- **The sweeper runs in production.** It's built (step 5), and every API server runs it. The admin course view's "Refund owed" mark is the alert for a refund Stripe keeps refusing. The API half is built (step 7a); the page is the admin course view area in [courses.md](courses.md). Build both before launch. Without it, a payment that should be refunded can wait indefinitely.
- Use `?sslmode=verify-full` in `DATABASE_URL` when the database is on another machine. The API refuses to start with anything weaker than `require` (the Prisma command line, used for migrations, doesn't check, so give it the same URL).
- Switch to live keys. Use a restricted key limited to Checkout Sessions read and write, and Refunds write.
- Create the production webhook endpoint with API version `2026-09-30.endive` (the one pinned in `stripeClientProvider`; set it in the Dashboard, or with `api_version` when creating the endpoint through the API), subscribed to exactly the handled event types:
  - `checkout.session.completed`
  - `checkout.session.expired`
- Turn on Stripe's automatic email receipts.
- Set `SMTP_URL`, `EMAIL_FROM` and `EMAIL_SHOP_NAME` for the real provider, and add its SPF and DKIM records for the sending domain. Send each email kind to a Gmail and an Outlook inbox and check how it looks.
- Confirm the payout currency matches `ALLOWED_CURRENCIES`.
- Ask the accountant about sales tax or VAT. Stripe Tax can be switched on later with `automatic_tax` and Dashboard setup.
- Set up per-IP limits at the CDN or edge:
  - 120 requests a minute by default;
  - the buy form at 10 a minute **and** 50 an hour (a Server Action posts to its page, so match POST `/courses/*`; see [web.md](web.md) *Launch*);
  - the webhook exempt;
  - log 429s and tune afterwards.

  The API doesn't produce 429s itself: `TOO_MANY_REQUESTS` was removed from the contract and the code, so the edge's 429s are the only ones.
- Manual test in Stripe test mode:
  1. Run `stripe listen --forward-to localhost:3001/v1/webhooks/stripe`.
  2. Pay with test card `4242…`.
  3. Run `stripe trigger checkout.session.expired`.
  4. Pay with a declining test card and confirm nothing is granted.

## Step 7. Refunds and disputes by hand, API side

- Why here: the sweeper (step 5) leaves a refund it can't push through with no visible alert, and the admin has no way to end a student's access.
- Needs: steps 5 and 6.
- Builds on: [payments.repository.ts](../api/src/payments/payments.repository.ts) `findOrphanPayments` and `markPaymentRefunded`, [enrollments.repository.ts](../api/src/enrollments/enrollments.repository.ts), [refunds.md](payments/refunds.md).
- Done when: `GET /v1/admin/courses/{courseId}` shows `refundStatus: "owed"` for a student with an orphan payment, and `POST …/revocation` sets `revokedAt` and moves the payment to `refunded`.

Design notes *(temporary)*:

- The new `admin-enrollments` module owns un-enroll. It sits outside `EnrollmentsModule`, which would otherwise import Payments and close a cycle.
- `refundStatus` runs one query per answer: the orphan payments for the listed course ids, matched to each enrollment by (course, customer).
- Un-enroll addresses an enrollment by customer id, because `AdminEnrollment` has no id and (course, customer) is unique.

Flow *(temporary)*:

```
Admin GET/list course                                    existing
└── each enrollment: refundStatus = "owed" if buyer has
    an orphan payment here, else "not_owed"              7a
Admin POST …/revocation                                  7d
├── bad course id → 400 INVALID_COURSE_ID                existing (7c)
├── bad customer id → 400 INVALID_CUSTOMER_ID            7d
├── no session → 401                                     existing
└── transaction                                          7b
    ├── no enrollment → 404 ENROLLMENT_NOT_FOUND         7b/7d
    ├── already revoked → 204, nothing changes           7b
    └── revokedAt = db now
        ├── free → 204                                   7b
        └── payment → refunded (markPaymentRefunded) 204 7b
```

Failures *(temporary)*:

| Actor | Failure | System does | Test |
|---|---|---|---|
| Admin | double-click | 204, nothing changes | 7b, 7d |
| Admin | un-enroll races a rebuy | guarded writes; rare, accepted | none |
| Admin | un-enroll without a Stripe refund | recorded as refunded | web confirm text |
| DB | second write fails | both writes roll back | 7b |
| Stripe | refund keeps failing | `refundStatus` stays `owed` | 7a |
