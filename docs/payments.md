# Payments

Read this before working on checkout, webhooks, enrollments, refunds or the email outbox. It records what the code can't tell you: progress, design intent, and why each choice was made. Shapes live elsewhere and aren't repeated here: the schema is in [contract.prisma](../api/src/prisma/contract.prisma), and endpoints and error codes are in [openapi-v1.yaml](../api/openapi/openapi-v1.yaml).

Keep this file current **in the same commit as the work**. Tick off status, add a decision row when something is decided, and when a step ships, cut its design notes down to decision rows.

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
  - [x] `PaymentsRepository`: event dedupe, lookup by our payment id, and guarded `pending →` transitions.
  - [x] `FulfillmentService` for `checkout.session.completed`, with `completedCheckoutFromEvent` reading Stripe's event in our terms.
  - [x] `StripeService.refundPayment`, called by `FulfillmentService.fulfillCheckout` after the transaction commits for a double purchase.
  - [x] `ExpiryService` for `checkout.session.expired`, with `expiredCheckoutFromEvent` beside the completed mapper.
  - [x] `StripeWebhookController` in `WebhooksModule`: verifies the signature, dispatches `completed` and `expired`, acknowledges other types.

  The manual `stripe listen` check is deferred to the *Launch* checklist, to run through the web checkout once step 5 exists.
- [x] **4. Email delivery:**
  - [x] `EmailOutboxRepository.findDue`, `markSent` and `markFailedAttempt`, with the backoff in `retry-policy.ts`.
  - [x] Templates for each `EmailKind` and `EmailSender` over SMTP.
  - [x] `EmailWorker` on a `@nestjs/schedule` interval, with `EmailComposer` loading each email's course, customer or payment (via `EmailViewsRepository`) and rendering it.
  - [x] Admin course view shows each enrollment's `emailStatus`, the only alert for a failed email.
- [ ] **5. Web:** **Next**
  - buy form on the course page;
  - `/checkout/success`, polling the status endpoint;
  - `/checkout/cancel`;
  - MSW handlers.

  Write the Given/When/Then specs in `web/docs/` first.
- [ ] **6. Safety net and after-sale handling:**
  - the sweeper;
  - `OWNER_EMAIL` setting (the recipient of `dispute_alert`), scoped to the email module's config;
  - `charge.refunded`;
  - `charge.dispute.created`;
  - the estimated payout on the admin price field.

  Open point: Stripe forgets idempotency keys after about 24 hours, so a sweeper retry of a double-purchase refund can't rely on `refund-<paymentId>` alone. Decide what else stops a second refund (Stripe rejects refunding a fully refunded charge; `charge.refunded` moves the payment out of the sweeper's query). The same refund rule also covers a double purchase whose two webhooks raced (see Decisions).
- [ ] **Launch:** see the checklist at the end.

## Principles

- **Stripe is the system of record for money.** The app stores only what it needs to grant access. The accountant works from Stripe's free Dashboard reports.
- **No monthly fees:**
  - hosted Checkout in one-time `payment` mode, card only;
  - prices sent inline (`price_data`), with no Stripe Products, Prices or Customers to keep in sync;
  - Stripe Tax, Billing, Invoicing and Radar for Fraud Teams stay off.

  Free courses (price 0) never touch Stripe.
- **Provider portability lives in the schema, not the code.** Every payment records its `provider`, and the `provider*` columns are generic. `StripeService` is a thin concrete wrapper with no gateway interface. Add one only when a second provider actually exists.
- **No network calls inside a DB transaction.** The service owns the transaction, and repositories take a `DbScope`. Stripe calls happen before the transaction starts or after it commits.
- **State only moves forward:**
  - payments go `pending` to `succeeded` or `expired`, and `succeeded` to `refunded`;
  - every transition is a conditional update, so a duplicate or out-of-order delivery changes nothing.

## Flows

**Checkout (built).** The course is loaded with the shared visibility rule, and the price is read on the server. A course that has ended returns 409 `COURSE_NOT_PURCHASABLE`. The customer is found or created by lowercased email. Then it depends on the customer's existing enrollment:

| Enrollment | Response | What happens |
|---|---|---|
| Active | `check_email` | Queues an "already owned" email with the link |
| Suspended | `check_email` | Queues an "access suspended" email with no link |
| Revoked, or none | Free: `check_email` | Grants or reactivates access and queues the access email |
| Revoked, or none | Paid: `redirect` | Creates a pending `Payment`, then the Stripe session (idempotency key `checkout-<paymentId>`, 31-minute expiry), then saves the session id |

An address that has received 5 or more emails in the last 24 hours (counted from `EmailOutbox`) still gets `check_email`, but nothing is queued.

**Webhook (step 3, built):**
1. Verify the signature (400 if it's invalid).
2. In one transaction:
   1. record the event id; if it's already recorded, reply 200 and stop;
   2. find the payment by `client_reference_id`;
   3. mark the payment succeeded with a conditional update;
   4. grant access and queue an email, depending on the enrollment:
      - **none:** create it;
      - **revoked:** reactivate it, pointing `paymentId` and `purchasedAt` at the new payment;
      - **active** (a double purchase from two tabs): queue "already owned" with `refundIssued: true`;
      - **suspended:** queue "access suspended".
3. After commit, refund a double purchase, keyed by our payment id. If the refund fails, still reply 200; the sweeper retries it.
4. Reply 2xx quickly. Emails are sent by the outbox worker, never during the request.

**Two layers of duplicate protection:**
- `ProcessedPaymentEvent` catches Stripe sending the same event again.
- The conditional updates catch the webhook and the sweeper racing each other. The sweeper has no event id, so the event table can't protect against that race.

**Refunds and disputes (step 6):**
- `charge.refunded` acts on **full refunds only**:
  - the payment becomes `refunded` and gets a `refundedAt`;
  - the enrollment found **by the refunded payment's id** gets a `revokedAt`.

  A partial refund changes nothing.
- `charge.dispute.created` sets `suspendedAt` and queues an alert to the owner. The owner settles the dispute in Stripe and restores access by hand. We don't subscribe to `dispute.closed`, and the payment status is left alone.

**Sweeper (step 6).** A cron job does two things:
- It re-checks payments still `pending` that were created between 1 hour and 7 days ago, by retrieving the Checkout Session and running the same fulfillment code. The 7-day limit caps the number of Stripe API calls.
- It retries missed double-purchase refunds: a succeeded payment with no enrollment pointing to it and no refund.

It also covers a payment whose session was never created.

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| Guest checkout; a customer is identified by lowercased email | No Stripe Customer objects to sync; saved cards would be the biggest lock-in risk | Stripe Customers, `PaymentProviderCustomer` (dropped) |
| Expiry is its own `ExpiryService`, and records the event even though `markPaymentExpired` is idempotent | Fulfillment stays about granting access; recording keeps redelivery handling identical across event types | A method on `FulfillmentService`; skipping the event record |
| Create the customer at checkout start | A pending `Payment` needs a `customerId` from the moment it's inserted | Creating it in the webhook |
| The customer keeps the first name given; Stripe's payer name is ignored | Simple, and the name isn't used for anything that matters | Overwriting it on each purchase |
| Request field is `customer.name`, not `name` | `name` alone reads as the course name | Top-level `name` and `email` |
| `check_email` for every outcome that doesn't redirect | Doesn't reveal whether an address owns a course | Telling the buyer "already owned". Accepted leak: for a paid course, an owner gets `check_email` while a new buyer gets `redirect` |
| Email cap per address, counted from `EmailOutbox` | The API can enforce it accurately; per-IP limits can't be, because the API only sees the Next server's address | — |
| Per-IP rate limiting deferred to launch, at the CDN or edge | See *Launch* for the limits | Rate limiting in the API |
| Only the webhook grants paid access | The success redirect can be faked or never arrive | Granting access on the return page |
| The webhook finds the payment by our id (`client_reference_id`) | Still works if saving the session id failed | Looking it up by session id |
| A double purchase (two checkouts started, then both paid) gets an automatic refund after commit | Rare, costs about one commit plus one sweeper rule, and the owner never has to act. Stripe keeps its fee either way | Doing nothing (the owner finds out from a complaint); emailing the owner to refund by hand (a new email kind and migration, plus ongoing owner work) |
| The refund handler finds the enrollment by the refunded payment's id | Refunding the extra payment of a double purchase can't revoke the buyer's real access | Looking it up by customer and course |
| Full refund → `revokedAt`, and the buyer may buy again (the same row is reactivated) | History stays on the refunded `Payment`, and the unique `(courseId, customerId)` key still holds | Deleting the enrollment, or inserting a second row |
| Dispute → `suspendedAt`, and the buyer can't buy again until the owner clears it | Disputes are rare; handling them by hand keeps the app simple | Automating dispute outcomes |
| `purchasedAt` is passed in by the caller, not left to the DB default | A webhook that arrives late can record the payment time from Stripe's event, not the processing time | DB `now()` |
| `rawBody: true` app-wide | It's Nest's documented option and is cheap; a per-route raw parser adds setup for no gain | A raw body parser on the webhook route only |
| `StripeService` throws `InvalidWebhookSignatureError`; the controller maps it to 400 | Keeps `StripeService` free of HTTP concerns | Throwing an HTTP exception from the service |
| The webhook route is documented in the contract (Webhooks tag) | The spec covers every route the API serves | Leaving it out |
| E2E tests use the `stripe-mock` container | The real SDK makes real HTTP calls, as close to production as tests get | A hand-written fake service, or mocks |
| Unit tests use a real `Stripe` client with `createFetchHttpClient` | Public SDK API only | Mocking SDK internals |
| `PaymentsRepository` methods return whether this call made the change | Fulfillment stops on `false`; the row itself isn't needed | Returning the updated row |
| Payment transitions use `updateAndCount` with the `status = pending` condition, not `update` | `update` reads the row, then updates it by id alone, so two callers can both see `pending` and both "win" (caught by the concurrency test). `updateAndCount` puts the condition in the `UPDATE` itself | `.where(...).update(...)`, or a `forUpdate()` read then a write |
| `markPaymentSucceeded` always sets `providerCheckoutId` | A payment has one session (idempotency key `checkout-<paymentId>`), so setting it equals filling it when missing, in one statement | A second update for a missing id only |
| `findPaymentForFulfillment` doesn't return the payment's status | The guarded transition decides; an early status check would be a second answer that can race | Checking status before the update |
| `FulfillmentService` takes a provider-neutral `CompletedCheckout`; `completedCheckoutFromEvent` in `stripe.service.ts` maps Stripe's event to it | Stripe's shapes stay in one file, and the sweeper can fulfill from a retrieved session that has no event | Passing `Stripe.CheckoutSessionCompletedEvent` into the service |
| A completed checkout that is unpaid, or whose `client_reference_id` is missing, not a UUID, or unknown, is recorded and ignored | It isn't a paid checkout we started. A non-UUID id would make Postgres throw, so Stripe would retry for days | Failing the webhook |
| A paid session without a payment intent throws | It breaks Stripe's own invariant; failing makes Stripe retry and puts it in the logs | Ignoring it |
| Two payments for one course fulfilled concurrently: the one that loses `grantAccess` stops with no email or refund, and the sweeper's refund rule picks it up | Rare; keeps fulfillment a straight line. Accepted cost: that payment gets no `already_owned` email | Re-reading the enrollment and re-dispatching to the double-purchase path |
| `fulfillCheckout` returns `void`; the refund decision is internal | The webhook only needs "handled"; the after-commit step belongs to the service, so the controller and sweeper don't repeat it | Returning the decision to the controller |
| Any refund failure is logged and swallowed, not just `PaymentProviderUnavailableError` | The event is already recorded, so Stripe redelivering it would do nothing; the sweeper owns the retry | Failing the webhook so Stripe retries |
| The refund uses `reason: "duplicate"` and `metadata.paymentId` | Labels it in the Dashboard for the accountant and shows our id; `charge.refunded` still finds the payment by payment intent, not by this metadata | No reason or metadata |
| Fulfillment emails aren't capped per address | Only a real payment queues them, and a buyer who paid must get the link | Reusing checkout's cap |
| The controller maps `InvalidWebhookSignatureError` to `INVALID_WEBHOOK_SIGNATURE` itself, and a missing `rawBody` is verified as an empty body | Only this controller needs the mapping; an empty body fails the signature check, so there is no separate case | An exception filter; a special case for a missing body |
| Unhandled event types are acknowledged with 200 | Stripe retries non-2xx for days; an event we don't act on needs no retry | 400 or 501 |
| Manual `stripe listen` check deferred to *Launch*, run through the web checkout | The frontend makes the requests better than hand-made ones, and one pass then covers every layer | Running it now with hand-made requests |
| Outbox retries: 1 minute doubling to a 1-hour cap, 8 attempts, then `failed` | About 2 hours of retrying covers a provider outage; the policy is a pure function | A fixed delay; retrying forever |
| No lease on emails being sent: one process, and the worker skips a tick while the last is running | Simplest. Accepted cost: a crash between the provider accepting an email and `markSent` sends it twice, and two API instances would double-send | A lease via `nextAttemptAt`; `FOR UPDATE SKIP LOCKED` |
| Email goes out over SMTP through nodemailer, with `SMTP_URL`, `EMAIL_FROM` and `EMAIL_SHOP_NAME` settings | Changing provider is a config change; the retry policy treats every failure alike, so a vendor SDK's richer errors buy nothing. Mailpit works locally | A vendor SDK (Resend, Postmark); Gmail (500 a day, no custom domain without Workspace, can suspend automated senders) |
| Each email is written once as an `EmailContent` (subject, heading, paragraphs, optional button) and rendered to HTML and plain text by two small renderers | A wording change is made once, HTML and text can't drift apart, and one layout keeps every email looking the same | A template per kind per format; react-email or MJML (a build step for four emails) |
| Worker polls every 10 s, up to 20 emails per run, one at a time; the constants live in the worker file, not env | Simple, and a shop this size sends few emails. Settings can move to config if the volume ever needs tuning | Env settings; sending a batch in parallel |
| A missing course, customer or payment is a failed attempt like any other, so it retries and ends `failed` | One rule for every failure; the admin view shows it | Marking such an email `failed` straight away |
| Templates take already-loaded views (course, customer), not ids | They stay pure functions; the worker owns the database lookups | An `EmailComposer` that reads the database |
| A `failed` email stays in the table with no owner alert; the admin course view shows email status | One place to look, nothing extra to run | Emailing or paging the owner |
| `emailStatus` is the status of the latest email to that customer about the course, and `failed` when none exists | An earlier failure doesn't matter once a later email went through; a missing email is something the owner must follow up, so it reads as `failed` rather than a fourth value | The worst status of all the enrollment's emails; `null` for no email |
| An `EnrollmentEmail` link table ties each customer email to its enrollment, and the admin view takes the newest in SQL. `grantAccess` returns the enrollment id so callers can pass it to `enqueue` | `EmailOutbox` stays a pure delivery queue with no nullable subject columns, and `dispute_alert` (about a payment) simply has no link. A `PaymentEmail` link can follow when step 6 needs one. No backfill: nothing was in production | Filtering `payload` in code, or a JSON filter (not in the ORM's public API); a nullable `enrollmentId` on the email; one joiner with nullable foreign keys; `latestEmailId` on `Enrollment` (a mutable pointer; older emails lose their link); `courseId` + `customerId` columns (undocumented composite relation) |
| Card only, no delayed methods | Payment is confirmed instantly, so there's no "processing" state | ACH and bank debits |
| Currencies limited to the payout currency (`ALLOWED_CURRENCIES`, default USD) | Any other currency adds a conversion fee to every sale | Accepting any currency |

## Launch checklist

- **Admin endpoints have no authentication yet** (see [courses.md](courses.md)). This blocks launch.
- Switch to live keys. Use a restricted key limited to Checkout Sessions read and write, and Refunds write.
- Create the production webhook endpoint subscribed to exactly the handled event types:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `charge.refunded`
  - `charge.dispute.created`
- Turn on Stripe's automatic email receipts.
- Set `SMTP_URL`, `EMAIL_FROM` and `EMAIL_SHOP_NAME` for the real provider, and add its SPF and DKIM records for the sending domain. Send each email kind to a Gmail and an Outlook inbox and check how it looks.
- Confirm the payout currency matches `ALLOWED_CURRENCIES`.
- Ask the accountant about sales tax or VAT. Stripe Tax can be switched on later with `automatic_tax` and Dashboard setup.
- Set up per-IP limits at the CDN or edge:
  - 120 requests a minute by default;
  - the buy form at 10 a minute **and** 50 an hour;
  - the webhook exempt;
  - log 429s and tune afterwards.

  Then remove the unused `TOO_MANY_REQUESTS` from the contract and the code, or start using it.
- Manual test in Stripe test mode:
  1. Run `stripe listen --forward-to localhost:3000/v1/webhooks/stripe`.
  2. Pay with test card `4242…`.
  3. Run `stripe trigger checkout.session.expired` and `stripe trigger charge.refunded`.
  4. Pay with a declining test card and confirm nothing is granted.
