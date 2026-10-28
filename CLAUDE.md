# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A small storefront for selling courses. Two independent yarn (v1) projects, each with its own `package.json`/`yarn.lock`; the root only holds husky git hooks.

- `api/` — NestJS 11 + Postgres via **Prisma 8 (RC)**, Stripe Checkout, Zod validation
- `web/` — **Next.js 16** (App Router, React 19), Tailwind 4, shadcn/base-ui.

Package-specific guidance lives in [api/CLAUDE.md](api/CLAUDE.md) and [web/CLAUDE.md](web/CLAUDE.md), loaded when working in that folder.

## Design docs — read the matching one before working in an area

- [docs/payments.md](docs/payments.md) — checkout, webhooks, enrollments, refunds, emails: status checklist (what's next), principles, launch checklist. Flows and decisions with rejected alternatives are split by subarea; read only the one you need:
  - [docs/payments/checkout.md](docs/payments/checkout.md) — starting a checkout.
  - [docs/payments/fulfillment.md](docs/payments/fulfillment.md) — Stripe webhook, fulfillment, expiry.
  - [docs/payments/email.md](docs/payments/email.md) — outbox, worker, templates, sender.
  - [docs/payments/refunds.md](docs/payments/refunds.md) — refunds, disputes, access, sweeper.
- [docs/courses.md](docs/courses.md) — creating, editing and browsing courses: who sees what, `PUT` semantics, validation, decisions.
- [docs/course-creation.md](docs/course-creation.md) — the admin "create course" page and the rich-text (Tiptap) description it needs: status checklist with the **Next** step, per-step design, decisions with rejected alternatives. Run with `/next-commit course-creation`.
- [docs/auth.md](docs/auth.md) — admin login, logout, sessions, the auth guard, and the command that creates admins: status checklist, principles, decisions.
- [docs/web.md](docs/web.md) — the web app: folder layout, how it calls the API, caching, errors, forms, admin login cookie: status checklist (what's next), principles, decisions.

Update them in the same commit as the code they describe: tick status, add a decision row when something is decided. Record only what the code can't say (progress, why, what was rejected); never copy schemas or contract shapes into them.

The root [README.md](README.md), [CONTRIBUTING.md](CONTRIBUTING.md) and [ARCHITECTURE.md](ARCHITECTURE.md) are the public face of the repo (it's linked from the owner's resume). Update them in the same commit whenever setup steps, commands, ports, env settings, the folder layout, module responsibilities, a diagrammed flow or the status of a major feature changes. Keep their claims true to the code, and keep the README's *Status* note honest about what isn't built yet.

## Commands

Run from the repo root with `yarn --cwd api …` / `yarn --cwd web …`, or from inside each package.

See package.json (in web/ and api/) and .husky for common project commands.

## Contract-first API

`api/openapi/openapi-v1.yaml` is the source of truth for every endpoint, request/response shape and error code. Change it first, then regenerate:

- `yarn --cwd api generate:api-types` → `api/src/generated/api.d.ts`
- `yarn --cwd web generate:api-types` → `web/src/lib/api/generated.ts`

Never hand-edit generated files. Both sides alias the generated schemas rather than redefining them: `api/types.ts` (imported as `"types.js"`) and `web/src/lib/types.ts`.
## Conventions

- Conventional commit messages with scopes, e.g. `feat(checkout): …`, `refactor(e2e): …`, `test(fixtures): …`.
- `ignore.md` at the root is a gitignored scratch file, not documentation.

## Working agreements

How the owner wants Claude to work on this repo:

- **One commit at a time.** Before coding a commit, give a detailed, easy-to-read outline (what, why, trade-offs) and wait for the go-ahead. Then implement, verify (type check and the relevant tests), and stop with a suggested conventional commit message. The owner makes the commits. Finish one commit's changes before starting the next: interactive `git add -p` isn't available, so mixed hunks can't be split.
- **Ask before any design or behaviour change**, however small, even inside an approved refactor. Mentioning it afterwards isn't enough.
- **Questions aren't instructions.** Answer them and stop; offer any resulting change as an option.
- **Plan mode.** A question or comment from the owner gets an answer in chat first. Don't edit the plan file or ask for plan approval until they say to update the plan. A message starting with `Q:` is chat-only; one starting with `plan:` goes into the plan.
- **Public library APIs only**, in code and tests: no undocumented error fields (e.g. `sqlState`), transitive-only exports or private members. If the public API can't do it, say so and suggest alternatives.
- **Modular, not speculative.** Give real responsibilities and shared logic their own focused module, but add no interfaces or abstractions for hypothetical needs (e.g. no payment gateway interface). Put flexibility where change is expensive: the DB schema. A thin concrete wrapper around an SDK is fine.
- **Small composed functions/files/commits.** A top-level method reads as a short orchestration of well-named steps, one method per outcome; a switch is only a thin dispatch with one line per case. The same with planning commits/work
- **Unambiguous labels.** Nest or qualify fields by owner (`customer.name`, not `name` beside `courseId`), in contracts, types and variables.
- **Clarify jargon** Use clear, easy-to-understand language.
- **Link files.** Any list of files is markdown links relative to the repo root, e.g. `[types.ts](api/types.ts)`.
- **Keep the design docs current** in the same commit (see *Design docs*).
- **Usage reviews.** At a natural pause (a step in a design doc's Status just finished, nothing complex in flight), review how the owner is using Claude and give a few tips, most impactful first. Give each a before/after for efficiency (context tokens per call, calls per commit) and quality (correction rounds per commit). Measure "before" from all session transcripts `usage` fields (`~/.claude/projects/<project>/<session>.jsonl`) since the last review and label anything else as an estimate. Never give raw token counts on their own: translate them into terms the owner can picture, such as "each message cost as much as N messages in a fresh session", or how long the weekly allowance would last.
- **`/next-commit`** (`.claude/skills/next-commit/`) runs the commit routine: find the **Next** item in `docs/`, outline, wait, implement, verify, update the doc.
