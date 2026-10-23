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
  - [x] `EmailOutboxRepository.findDue`, `markSent` and `markFailedAttempt`, with the backoff in `retry-policy.ts`.
  - [x] Templates for each `EmailKind` and `EmailSender` over SMTP.
  - [x] `EmailWorker` on a `@nestjs/schedule` interval, with `EmailComposer` loading each email's course, customer or payment (via `EmailViewsRepository`) and rendering it.
  - [x] Admin course view shows each enrollment's `emailStatus`, the only alert for a failed email.
- [ ] **5. Sweeper** (see *Sweeper* in [refunds.md](payments/refunds.md)). It comes before web checkout because three paths take a buyer's money and leave the refund to it: two payments fulfilled at once, a refund that failed after commit, and a failed refund for a suspended buyer. Starts once every item in [review-follow-ups.md](review-follow-ups.md) is done.

  Open questions for its outline, each with a recommendation:
  - **A pending payment with no Stripe session after 1 hour.** Stripe can't look a session up by our payment id, and the session may exist and be paid, with its webhook delayed. Expiring the payment then would make the late `completed` webhook find a payment that isn't pending, so the buyer pays and gets nothing. *Decision:* expire such a payment only once it's older than Stripe's webhook retry window (about 3 days in live mode). 
  - **A second refund after Stripe forgets the idempotency key** (about 24 hours), so a retry can't rely on `refund-<paymentId>` alone. Stripe refuses to refund a charge that's already fully refunded, with error code `charge_already_refunded`. *Decision:* treat that error as success, and after a refund succeeds or was already done, mark the payment `refunded` with a guarded `succeeded → refunded` update, so the sweeper's query stops selecting it and a later `charge.refunded` changes nothing. The same rule covers a double purchase whose two webhooks raced (see Decisions).
- [ ] **6. Web:**
  - buy form on the course page;
  - `/checkout/success`, polling the status endpoint;
  - `/checkout/cancel`;
  - MSW handlers.

  Write the Given/When/Then specs in `web/docs/` first.
- [ ] **7. Refunds, disputes and the owner alert** (see [refunds.md](payments/refunds.md)):
  - `OWNER_EMAIL` setting (the recipient of `dispute_alert`), scoped to the email module's config;
  - `charge.refunded`;
  - `charge.dispute.created`;
  - the estimated payout on the admin price field.
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

- **Admin endpoints have no authentication yet** (see [courses.md](courses.md)). This blocks launch.
- **The sweeper (step 5) is running.** This blocks launch: without it, a payment that should be refunded can wait indefinitely.
- Switch to live keys. Use a restricted key limited to Checkout Sessions read and write, and Refunds write.
- Create the production webhook endpoint with API version `2026-09-30.endive` (the one pinned in `stripeClientProvider`; set it in the Dashboard, or with `api_version` when creating the endpoint through the API), subscribed to exactly the handled event types:
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

  The API doesn't produce 429s itself: `TOO_MANY_REQUESTS` was removed from the contract and the code, so the edge's 429s are the only ones.
- Manual test in Stripe test mode:
  1. Run `stripe listen --forward-to localhost:3000/v1/webhooks/stripe`.
  2. Pay with test card `4242…`.
  3. Run `stripe trigger checkout.session.expired` and `stripe trigger charge.refunded`.
  4. Pay with a declining test card and confirm nothing is granted.
