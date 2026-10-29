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
- [ ] **6. Web:** **Next** (structure and decisions in [web.md](web.md); do its steps 1–5 first)
  - buy form on the course page: a Server Action with `useActionState`; `lib/api/form-errors.ts` (API field errors to form fields) arrives here;
  - `/checkout/success`, rendered on the server and refreshed with `router.refresh()` while the status is `pending`;
  - no cancel page: Stripe's cancel URL is the course page ([stripe-redirect.service.ts](../api/src/checkout/stripe-redirect.service.ts));
  - MSW handlers.

  Write the Given/When/Then specs first, in the step text here.
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

- **The sweeper runs in production.** It's built (step 5), and every API server runs it. Check the logs after deploying: a repeating `Couldn't refund payment …` line is the only alert for a refund Stripe keeps refusing. Without it, a payment that should be refunded can wait indefinitely, so this blocks launch.
- Use `?sslmode=verify-full` in `DATABASE_URL` when the database is on another machine. The API refuses to start with anything weaker than `require` (the Prisma command line, used for migrations, doesn't check, so give it the same URL).
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
  - the buy form at 10 a minute **and** 50 an hour (a Server Action posts to its page, so match POST `/courses/*`; see [web.md](web.md) *Launch*);
  - the webhook exempt;
  - log 429s and tune afterwards.

  The API doesn't produce 429s itself: `TOO_MANY_REQUESTS` was removed from the contract and the code, so the edge's 429s are the only ones.
- Manual test in Stripe test mode:
  1. Run `stripe listen --forward-to localhost:3001/v1/webhooks/stripe`.
  2. Pay with test card `4242…`.
  3. Run `stripe trigger checkout.session.expired` and `stripe trigger charge.refunded`.
  4. Pay with a declining test card and confirm nothing is granted.
