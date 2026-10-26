# Architecture

This is the map to read before changing code. It covers the parts that rarely change: what the pieces are, how a request moves through them, and the rules the code relies on everywhere. Details live in other places, and this file links to them instead of copying them:

- endpoint shapes and error codes: [openapi-v1.yaml](api/openapi/openapi-v1.yaml);
- the database schema: [contract.prisma](api/src/prisma/contract.prisma);
- progress, flows and decisions for each area: the [design docs](docs/).

## What the system does

- **The owner** creates and edits courses through admin endpoints. A course has a schedule, a price history and a private content link (a Google Drive folder or a Zoom meeting).
- **Buyers** browse published courses on the web app and start a checkout with their name and email.
  - **A free course** enrolls them immediately.
  - **A paid course** sends them to Stripe's hosted payment page.
- **Access is granted only when Stripe's signed webhook confirms the payment.** The buyer is then emailed the content link.

Stripe is the record of money: the app stores only what it needs to decide who has access.

## Components

```
                ┌──────────────────────────────┐
  browser ─────▶│ web/  Next.js 16             │
                │ server components fetch data;│
                │ the browser never calls the  │
                │ API directly                 │
                └──────────────┬───────────────┘
                               │ REST, /v1/..., typed from the OpenAPI spec
                               ▼
                ┌──────────────────────────────┐        ┌──────────────┐
                │ api/  NestJS 11              │───────▶│ PostgreSQL   │
                │                              │        └──────────────┘
                │ courses   checkout  webhooks │        ┌──────────────┐
                │ payments  enrollments email  │───────▶│ SMTP server  │
                └──────▲───────────────┬───────┘        └──────────────┘
                       │ signed        │ create checkout sessions,
                       │ webhooks      │ refunds
                ┌──────┴───────────────▼───────┐
                │ Stripe                       │
                └──────────────────────────────┘
```

`api/` and `web/` are separate yarn projects, each with its own dependencies. They share one thing: the OpenAPI spec, which both generate types from.

## Code map

### API modules (`api/src/`)

| Module | Responsibility |
|---|---|
| [courses/](api/src/courses/) | Public browsing and admin create/edit. [course-visibility.ts](api/src/courses/course-visibility.ts) holds the one definition of "publicly visible", shared with checkout. |
| [checkout/](api/src/checkout/) | Starting a checkout: decide what the buyer gets, record it, then hand off to Stripe. Also the status endpoint. |
| [payments/](api/src/payments/) | `Payment` records, the Stripe wrapper ([stripe.service.ts](api/src/payments/stripe.service.ts)), fulfillment of completed checkouts, expiry, refunds, and the sweeper ([payment-sweeper.ts](api/src/payments/payment-sweeper.ts)) that puts right what a webhook couldn't. |
| [webhooks/](api/src/webhooks/) | The Stripe webhook endpoint: verify the signature, then hand each event type to its service. |
| [enrollments/](api/src/enrollments/) | Granting and reactivating access, shared by checkout and fulfillment. |
| [auth/](api/src/auth/) | Admin accounts and password hashing, login and logout (sessions kept in Postgres, a limit on login tries per email, an hourly job that deletes expired ones), the guard that checks a session token on every route not marked `@Public()`, and the command that creates an admin ([set-admin-password.ts](api/src/auth/cli/set-admin-password.ts)). |
| [email/](api/src/email/) | The outbox table, the background worker, templates and the SMTP sender. |
| [prisma/](api/src/prisma/) | The database schema and connection. |
| [common/](api/src/common/) | Error responses and request validation used by every module. |

### Web (`web/src/`)

| Folder | Responsibility |
|---|---|
| [app/](web/src/app/) | Pages: the home page with the course list, and a page for each course. |
| [components/](web/src/components/) | An async *container* that fetches data, plus a pure *view* that renders it. |
| [lib/api/](web/src/lib/api/) | The typed API client (server-only), with one wrapper per endpoint. |
| [mocks/](web/src/mocks/) | MSW handlers, one file per endpoint, each with named scenarios (`success`, `notFound`, `error`, …). |

## Layers inside the API

```
  HTTP request
       │
┌──────▼───────┐  checks the body against a Zod schema,
│ Controller   │  maps to and from contract types
└──────┬───────┘
┌──────▼───────┐  business rules; starts and owns the database
│ Service      │  transaction; calls Stripe only outside it
└──┬────────┬──┘
   │        │
┌──▼───────┐ ┌▼───────────────┐
│Repository│ │ StripeService  │
│ the only │ │ the only code  │
│ code that│ │ that uses the  │
│ touches  │ │ Stripe SDK     │
│ the DB   │ │                │
└──┬───────┘ └┬───────────────┘
   ▼          ▼
PostgreSQL   Stripe
```

Repositories take a `scope` as their first argument: either the plain database connection or an open transaction. That lets a service run several repositories inside one transaction, so their writes succeed or fail together.

## Web: container and view

```
page.tsx
   └─▶ courses.tsx         async server component: calls lib/api/courses.list.ts
          │                gets back Result = success(data) | failure(problem)
          ▼
       courses-view.tsx    pure render of the Result; unit-tested with a
                           hand-built Result, no network needed
```

API wrappers return a `Result` instead of throwing, so every page has to handle the failure case explicitly.

## A paid purchase, start to finish

```
Buyer            web        api                               Stripe
  │ buy            │          │                                  │
  ├───────────────▶│ POST /v1/checkout-sessions                  │
  │                ├─────────▶│ 1. one DB transaction:           │
  │                │          │    find/create customer,         │
  │                │          │    record a pending Payment      │
  │                │          │ 2. after commit: create a        │
  │                │          │    Checkout session ────────────▶│
  │                │◀─────────┤    reply with Stripe's URL       │
  │◀───────────────┤ redirect │                                  │
  ├────────────── pays on Stripe's hosted page ─────────────────▶│
  │                │          │◀── checkout.session.completed ───┤
  │                │          │ 3. verify the signature          │
  │                │          │ 4. one DB transaction:           │
  │                │          │    record the event (once only), │
  │                │          │    pending → succeeded (guarded),│
  │                │          │    grant the enrollment,         │
  │                │          │    queue the access email        │
  │                │          ├─── 200 OK ──────────────────────▶│
  │                │          │ 5. email worker sends the course │
  │◀── email with the course link (SMTP) ──┤                     │
```

If step 4 fails partway, the transaction rolls back and the event isn't recorded. Stripe retries the webhook, and the work runs again from the start.

Other outcomes of step 1:

- **A free course** enrolls the buyer and queues the access email at once. Stripe is never involved.
- **A buyer who already owns the course** gets an email instead of a second charge.

Every outcome except the Stripe redirect returns the same "check your email" response. That way the API never reveals whether an email address already owns a course. An email address can receive at most 5 checkout emails per 24 hours, so the form can't be used to flood someone's inbox.

Other outcomes of step 4:

- **A buyer who already has access** (they started two checkouts and paid both) is refunded once the transaction commits, and gets an email explaining it.
- **A buyer whose access is suspended** by a dispute is also refunded and told why.

Flow details and decisions: [checkout.md](docs/payments/checkout.md), [fulfillment.md](docs/payments/fulfillment.md).

## State that only moves forward

```
                checkout.session.completed
            ┌─────────────────────────────▶ succeeded ──refund──▶ refunded
  pending ──┤                                                    (our own refunds;
            └─────────────────────────────▶ expired               Stripe-side ones planned)
                checkout.session.expired
```

Every arrow is a conditional `UPDATE … WHERE status = <from>`, which returns how many rows changed. If it changed 0 rows, another caller already moved the payment, so this call does nothing more. Two copies of the same webhook, or two webhooks arriving at once, can't both grant access.

An **enrollment** is active while both `revokedAt` (set by a refund) and `suspendedAt` (set by a dispute) are empty. [enrollment-access.ts](api/src/enrollments/enrollment-access.ts) is the one place that classifies it.

## The sweeper

The webhook can't fix everything. A refund can fail after the database changes were saved, and a webhook can be lost. So [PaymentSweeper](api/src/payments/payment-sweeper.ts) runs every 10 minutes and does three checks, each moving a payment forward with the same conditional updates and the same fulfillment code as the webhook:

1. **Refund** paid payments that no enrollment points to (a double purchase, a suspended buyer, or two payments fulfilled at once) and whose refund failed.
2. **Ask Stripe** about pending payments whose webhook is over an hour late, and fulfill or expire them.
3. **Expire** pending payments that never got a Stripe checkout, once Stripe's webhook retries (about 3 days) are over.

Every API server runs it. That's safe because every change is conditional and a refund is keyed by the payment id.

## The email outbox

```
 inside the transaction that              EmailWorker, every 10 seconds,
 makes the change                         up to 20 emails each time
┌────────────────────────────────┐       ┌──────────────────────────────────┐
│ write the enrollment / payment │       │ find due emails, oldest first    │
│ + insert an EmailOutbox row    │──────▶│ claim each one (guarded update)  │
│   holding IDs only, never the  │       │ load the data, render, send      │
│   rendered message             │       │   ok   → mark sent               │
└────────────────────────────────┘       │   fail → retry after 1, 2, 4 …   │
                                         │          up to 60 minutes; after │
                                         │          8 attempts, mark failed │
                                         └──────────────────────────────────┘
```

Because the email row is written in the same transaction as the change, an email exists only if the change was saved. The message is rendered at send time from IDs, so it shows current data. On shutdown the worker finishes the email it's sending before the process exits. A failed email shows up on the admin course view. Details: [email.md](docs/payments/email.md).

## Admin login

1. The owner runs `yarn admin:set-password <email>` on a server to create the account.
2. `POST /v1/admin/sessions` checks the password (Argon2id hash) and returns a random token once. Only its SHA-256 hash is stored in Postgres, so every API server accepts it and logout works everywhere at once. A session lasts 7 days at most, or 24 hours unused.
3. Every other request sends `Authorization: Bearer <token>`. A global guard looks the session up; routes marked `@Public()` (browsing, checkout, the Stripe webhook, login) skip it. Without a valid session the answer is `401` before the body is even validated.
4. Admin responses carry `Cache-Control: no-store`.

## Rules the code relies on

Break one of these and something subtle goes wrong, usually money or access.

1. **No network calls inside a database transaction.** Call Stripe before the transaction or after it commits.
2. **Guarded changes use `updateAndCount` with the condition in the `WHERE`.** Inserts that might already exist use `createAndCount(…, { onConflict: "skip" })`. Never read-then-write, and never detect database errors by driver error code.
3. **Only the verified webhook grants paid access.** The success redirect only shows status.
4. **"Publicly visible" has one definition**, in [course-visibility.ts](api/src/courses/course-visibility.ts): the latest status is `published` and some price has taken effect. Reuse it. Course status and prices are append-only histories.
5. **A payment copies its amount and currency at checkout start.** A later price change never alters what someone paid.
6. **The content link is private.** Only admin responses and the access email include it.
7. **The OpenAPI spec comes first.** Change it, regenerate the types, then write code. Never edit generated files.
8. **Each module validates its own settings at startup** with Zod (`*-config.ts` beside the code that uses them). A bad setting stops the app immediately, naming the variable but never printing its value.

## Cross-cutting concerns

- **Errors.** Every error is an RFC 9457 `application/problem+json` response with a stable error code. Validation errors list each field as a JSON Pointer (for example `/prices/0/amount`) with a code such as `TOO_SHORT`. See [common/errors/](api/src/common/errors/).
- **Versioning.** Every route lives under `/v1/`. [configure-app.ts](api/src/configure-app.ts) applies versioning and the error handler for both the real app and the end-to-end tests.
- **Time.** Timestamps are `Temporal.Instant` values, not `Date`. The API accepts and returns only UTC times ending in `Z`.
- **Security.**
  - The webhook signature is checked over the raw request bytes.
  - Prices sent to Stripe come from the database, never from the buyer.
  - The Stripe key should be a restricted key, limited to checkout sessions and refunds.
  - Rate limits belong at the CDN or edge (see the launch checklist in [payments.md](docs/payments.md)).
  - Every route needs an admin login unless it is marked `@Public()`; see [Admin login](#admin-login).
- **Testing.** Each layer has its own kind of test: unit tests with typed mocks, integration tests against a real database, and end-to-end tests through HTTP with stripe-mock. See [CONTRIBUTING.md](CONTRIBUTING.md#writing-tests).

## Where to read next

- [docs/payments.md](docs/payments.md): status, principles, the launch checklist, and links to the checkout, fulfillment, email and refunds docs.
- [docs/courses.md](docs/courses.md): who sees which courses, how editing works, validation, and decisions.
