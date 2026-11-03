# Course Merchant

[![CI](https://github.com/0styx0/course-merchant/actions/workflows/ci.yml/badge.svg)](https://github.com/0styx0/course-merchant/actions/workflows/ci.yml)

A storefront where a small business sells online courses. The API handles the whole purchase: a buyer pays on Stripe's hosted page and receives the course link (a Google Drive folder or a Zoom meeting) by email. The buyer-facing web pages are the next piece to build; the owner already manages courses from an admin area.

**My role:** paid freelance work, and I am the sole developer. I designed, built and tested the NestJS API and the Next.js web app (Sep 2026 to now).

<!-- TODO: add a screenshot or short GIF of the admin create-course form and the course list here. -->

**Try it in one command, with no database, API or Stripe account:**

```sh
yarn install && yarn --cwd web install && yarn --cwd web dev:mock
```

This serves the web app on http://localhost:3000 with canned API responses. Open the course list at `/`, or the admin create-course form (rich-text description, image upload) at `/admin/courses/new`.

## What this project shows

- **Payments stay correct when Stripe retries or races.** Stripe can deliver the same webhook twice, or two webhooks at once. The API records each event once, and every payment status change is a single conditional `UPDATE` (for example "set `succeeded` where the status is still `pending`"), so only one caller can make it. See [payments.repository.ts](api/src/payments/payments.repository.ts).
- **Only a verified webhook grants paid access.** The success page a buyer lands on grants nothing, because anyone can visit that URL. The API checks the webhook signature against the exact request bytes. A buyer who pays twice for one course gets the second payment refunded automatically. See [stripe-webhook.controller.ts](api/src/webhooks/stripe-webhook.controller.ts) and [fulfillment.service.ts](api/src/payments/fulfillment/fulfillment.service.ts).
- **A background job repairs what a webhook could not.** The "sweeper" runs every 10 minutes. It retries refunds that failed and finishes payments whose webhook never arrived. See [payment-sweeper.ts](api/src/payments/sweeper/payment-sweeper.ts).
- **Emails survive crashes and retries, and never go out for something that did not happen.** The API writes each email to an outbox table in the same database transaction as the change it describes (the *transactional outbox* pattern). A worker sends the emails and retries failures with growing delays. It claims each email first, so several copies of the API never send one twice. See [email-worker.ts](api/src/email/delivery/email-worker.ts).
- **One contract for both sides.** [openapi-v1.yaml](api/openapi/openapi-v1.yaml) defines every endpoint, request, response and error code. The API and the web app generate their TypeScript types from it, so a mismatch fails the type check. Errors follow the [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem format.
- **Three levels of tests, enforced by git hooks.** Unit tests; integration tests against a real PostgreSQL in Docker; and end-to-end tests that drive the whole API over HTTP, with the real Stripe SDK talking to [stripe-mock](https://github.com/stripe/stripe-mock), Stripe's official mock server. The web app uses Vitest, Playwright and [MSW](https://mswjs.io/).
- **Decisions are written down.** The [design docs](docs/) record each decision and the alternatives I rejected, and [ARCHITECTURE.md](ARCHITECTURE.md) walks through a full purchase.

## How it fits together

```
   Buyer's browser
     │         │
     │ pages   │ pays on Stripe's hosted page
     ▼         ▼
┌──────────┐  ┌──────────────────┐
│ web/     │  │ Stripe Checkout  │
│ Next.js  │  └──┬───────────▲───┘
└────┬─────┘     │ signed    │ create checkout sessions,
     │ REST      │ webhooks  │ refunds
     │ /v1/...   ▼           │
     │      ┌────────────────┴───┐      ┌────────────┐
     └─────▶│ api/  NestJS       │─────▶│ PostgreSQL │
            │ courses, checkout, │      └────────────┘
            │ webhooks, email    │      ┌────────────┐
            │                    │─────▶│ SMTP email │
            └────────────────────┘      └────────────┘
```

The web app calls the API only from the server, never from the browser.

## Tech stack

| Area | Tools |
|---|---|
| API | NestJS 11, TypeScript, Zod validation, OpenAPI 3 |
| Database | PostgreSQL 17, Prisma 8 (release candidate; the stable release is due in November 2026) |
| Payments | Stripe Checkout and webhooks |
| Email | SMTP through Nodemailer, sent from an outbox table |
| Web | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui |
| Testing | Vitest, Supertest, stripe-mock, Playwright, MSW |
| Tooling | Docker Compose, ESLint, Prettier, husky git hooks |

## Status

- **Built and tested:**
  - the API for courses, checkout, Stripe webhooks, email and admin login;
  - the web admin create-course form with image upload, and an edit page (details, status, image, delete with confirmation).
- **Next:** the web checkout pages, the other admin pages and the login form.
- **Later:** a job that cleans up old sessions, and handling refunds and disputes made in Stripe.

Progress lives in [docs/payments.md](docs/payments.md) and [docs/courses.md](docs/courses.md).

<details>
<summary><strong>Run the whole stack locally</strong></summary>

**You need:** Node.js 26+, [Yarn 1](https://classic.yarnpkg.com/), and Docker.
**Optional:** the [Stripe CLI](https://docs.stripe.com/stripe-cli) to receive webhooks locally, and [Mailpit](https://mailpit.axllent.org/) to see emails.

```sh
# 1. Install dependencies. The root install also sets up the git hooks.
yarn install
yarn --cwd api install
yarn --cwd web install

# 2. Start PostgreSQL for development (port 5432)
docker compose up -d

# 3. Configure the API, then edit api/.env:
#    DATABASE_URL="postgresql://course_app:course_app@localhost:5432/course_app"
#    plus your Stripe test-mode keys and an SMTP URL
cp api/.env.example api/.env

# 4. Create the database tables
yarn --cwd api db:dev:migrate

# 5. Create the admin account (asks for a password, 15 to 128 characters)
yarn --cwd api build && yarn --cwd api admin:set-password you@example.com

# 6. Run the API on http://localhost:3001
yarn --cwd api start:dev

# 7. In a second terminal, run the web app on http://localhost:3000
echo 'API_BASE_URL=http://localhost:3001' > web/.env.local
yarn --cwd web dev
```

The API and the web app check their settings when they start. A missing or invalid one stops them with an error naming the variable.

In production the web app refuses to start unless `API_BASE_URL` starts with `https://` (or points at the same machine), because admin tokens travel in that connection. `yarn --cwd web build` needs the API running: it renders the home page once, and the server then renders it again at most once a minute.

**Emails locally:** run `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit`, set `SMTP_URL="smtp://localhost:1025"`, and read the mail at http://localhost:8025.

**Webhooks locally:** run `stripe listen --forward-to localhost:3001/v1/webhooks/stripe`, and copy the `whsec_…` secret it prints into `STRIPE_WEBHOOK_SECRET`.

</details>

## Running tests

| Command | What it checks | Needs |
|---|---|---|
| `yarn --cwd api test:unit` | API logic, with dependencies mocked | Nothing |
| `yarn --cwd api test:integration` | Repositories and services against a real database | Docker. Starts a test PostgreSQL on port 5433 and stripe-mock on 12111 |
| `yarn --cwd api test:e2e` | The whole API over HTTP, with the real Stripe SDK against stripe-mock | Docker |
| `yarn --cwd web test:unit` | Components, with the API mocked by MSW | Nothing |
| `yarn --cwd web test:browser` | Pages in Chromium through Playwright, with the API mocked | `yarn --cwd web playwright install chromium` once |

The git hooks run these for you: unit tests and type checks before each commit, and integration, browser and end-to-end tests before each push. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Project layout

```
.
├── api/                  NestJS API (its own package.json)
│   ├── openapi/          the API contract: source of truth for every endpoint
│   ├── migrations/       database migrations
│   └── src/              one folder per module: courses, checkout, payments,
│                         webhooks, enrollments, email, prisma, common
├── web/                  Next.js web app (its own package.json)
│   ├── src/app/          routes (App Router)
│   ├── src/features/     per area: API wrappers, sections, components
│   ├── src/components/   app-wide components
│   ├── src/lib/api/      typed API client
│   └── src/mocks/        MSW handlers for tests and dev:mock
├── docs/                 design docs: status, decisions, rejected options
└── .husky/               git hooks shared by both projects
```

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): how the system is put together.
- [CONTRIBUTING.md](CONTRIBUTING.md): how to make a change, write tests and commit.
- Design docs:
  - [docs/payments.md](docs/payments.md): checkout, webhooks, email, refunds, and the launch checklist.
  - [docs/courses.md](docs/courses.md): creating, editing and browsing courses.

## License

All rights reserved. The client approved publishing this code so it can be reviewed. No license is granted to use, copy, modify or distribute it.
