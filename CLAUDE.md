# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A small storefront for selling courses. Two independent yarn (v1) projects, each with its own `package.json`/`yarn.lock`; the root only holds husky git hooks.

- `api/` — NestJS 11 + Postgres via **Prisma 8 (RC)**, Stripe Checkout, Zod validation
- `web/` — **Next.js 16** (App Router, React 19), Tailwind 4, shadcn/base-ui.

Package-specific guidance lives in [api/CLAUDE.md](api/CLAUDE.md) and [web/CLAUDE.md](web/CLAUDE.md), loaded when working in that folder. Narrower API rules (database, tests) are in [.claude/rules/](.claude/rules/) and load when you touch matching files.

## Design docs — read the matching one before working in an area

Each doc has a status checklist (what's next), principles and decisions with rejected alternatives. Payments is split by subarea; read only the one you need.

- [docs/payments.md](docs/payments.md) — checkout, webhooks, enrollments, refunds, emails, launch checklist:
  - [docs/payments/checkout.md](docs/payments/checkout.md) — starting a checkout.
  - [docs/payments/fulfillment.md](docs/payments/fulfillment.md) — Stripe webhook, fulfillment, expiry.
  - [docs/payments/email.md](docs/payments/email.md) — outbox, worker, templates, sender.
  - [docs/payments/refunds.md](docs/payments/refunds.md) — refunds, disputes, access, sweeper.
- [docs/courses.md](docs/courses.md) — creating, editing and browsing courses: who sees what, `PUT` semantics, validation.
- [docs/course-creation.md](docs/course-creation.md) — the admin "create course" page and its rich-text (Tiptap) description. Run with `/next-commit course-creation`.
- [docs/auth.md](docs/auth.md) — admin login, logout, sessions, the auth guard, the command that creates admins.
- [docs/web.md](docs/web.md) — the web app: folder layout, API calls, caching, errors, forms, admin login cookie.

The docs record decisions made with the information available at the time; they are not absolute. When new information (a library's real behaviour, a bug, a constraint found while coding, a better option) undermines a documented decision, say so before building on it: state what changed, why the decision may no longer hold, and recommend a revised approach. The owner decides, then the doc is updated.

Update them in the same commit as the code they describe: tick status, add a decision row when something is decided. Record only what the code can't say (progress, why, what was rejected); never copy schemas or contract shapes into them.

The root [README.md](README.md), [CONTRIBUTING.md](CONTRIBUTING.md) and [ARCHITECTURE.md](ARCHITECTURE.md) are the public face of the repo (linked from the owner's resume). Update them in the same commit whenever setup steps, commands, ports, env settings, the folder layout, module responsibilities, a diagrammed flow or the status of a major feature changes. Keep their claims true to the code, and keep the README's *Status* note honest about what isn't built yet.

## Commands

Run from the repo root with `yarn --cwd api …` / `yarn --cwd web …`, or from inside each package. See `package.json` (in `web/` and `api/`) and `.husky` for the scripts. Edited `api/` and `web/` files are formatted by a hook ([format-edited.sh](.claude/hooks/format-edited.sh)); don't run prettier by hand after each edit.

## Contract-first API

`api/openapi/openapi-v1.yaml` is the source of truth for every endpoint, request/response shape and error code. Change it first, then regenerate:

- `yarn --cwd api generate:api-types` → `api/src/generated/api.d.ts`
- `yarn --cwd web generate:api-types` → `web/src/lib/api/generated.ts`

Never hand-edit generated files (a hook refuses it), and never read them whole (they're large): grep for the type or operation name. Both sides alias the generated schemas rather than redefining them: `api/types.ts` (imported as `"types.js"`) and `web/src/lib/types.ts`.

## Conventions

- Conventional commit messages with scopes, e.g. `feat(checkout): …`, `refactor(e2e): …`, `test(fixtures): …`. No `Co-Authored-By` trailer.
- `ignore.md` at the root is a gitignored scratch file, not documentation.
- **File names state everything the file exports.** Rename or split the file when its exports outgrow its name.
- **A function name states what it returns.** A function that returns a formatter is `makeDateFormatter`, not `formatDate`.
- **At most 10 files per folder**, not counting sub-folders; spec files count. Generated and vendored code (`generated.ts`, `migrations/`, `components/ui/`) doesn't. The pre-commit hook ([check-folder-file-count.sh](.husky/check-folder-file-count.sh)) fails when a folder passes it; group the files by job in the same commit that adds the 11th. Name the folder for its job (`stripe/`, `fulfillment/`), never `utils/` or `misc/`.
- **Labels:** milestone `3`, commit `3b`; never a deeper level (`3b-i`). Split a commit by re-lettering the rest.
- To move files, move parent folders before their children; steps are in [api/CLAUDE.md](api/CLAUDE.md#moving-and-renaming-files).

## Working agreements

How the owner wants Claude to work on this repo.

**Workflow**
- **One commit at a time.** Before coding a commit, give a detailed, easy-to-read outline (what, why, trade-offs) and wait for the go-ahead. The exceptions are a **mechanical** commit (file moves, renames, splits with the same content, doc-only changes, fixes that make existing code pass a lint rule) and a **plan-conformant** commit (its plan line has no open question, the build finds no deviation from the line, and no decision row is added): give a short outline of about 5 lines (with the test table, for plan-conformant ones) and go straight on without waiting. Deviations are listed in the hand-off. Then implement, verify (type check and the relevant tests), and stop with a suggested conventional commit message. The owner makes the commits. Finish one commit's changes before starting the next: interactive `git add -p` isn't available, so mixed hunks can't be split. `/next-commit` ([skill](.claude/skills/next-commit/SKILL.md)) runs this routine from the **Next** item in `docs/`.
- **Planning a new area.** `/plan-create-overview` ([skill](.claude/skills/plan-create-overview/SKILL.md)) writes a one-page map of milestones; when a milestone is **Next**, `/plan-create-implementation` ([skill](.claude/skills/plan-create-implementation/SKILL.md)) designs it and splits it into commits; `/next-commit` builds each commit. The overview ends with a self-check against its own Principles and a subagent review when the map has a decision row; repo-specific facts the skills use are in [.claude/skills/_shared/project.md](.claude/skills/_shared/project.md); milestones follow [.claude/skills/_shared/milestone-line.md](.claude/skills/_shared/milestone-line.md).
- **Usage reviews.** About once a month, or when you ask about usage or token cost, run `/usage-review`.
- **Keep the design docs current** in the same commit (see *Design docs*).

**When to stop and ask**
- **Ask before any design or behaviour change**, even inside an approved refactor. A design or behaviour change is a deviation from the commit line, a Decision row or the contract; status ticks and details the commit line already covers (a helper's name, which sibling to copy) are not. Mentioning it afterwards isn't enough. If a commit planned as mechanical turns out to change behaviour or design, stop and give the full outline.
- **Push back as information comes in.** Past decisions (in docs, plans or earlier in the session) aren't binding when new facts contradict them. Raise the conflict in chat with a recommendation instead of complying or working around it quietly.
- **Decision rows in `docs/`:** propose the row text in chat and wait for an OK before editing. Status ticks and plan text can be updated without asking.
- **Questions aren't instructions.** Answer them and stop; offer any resulting change as an option.
- **Plan mode.** A question or comment from the owner gets an answer in chat first. Don't edit the plan file or ask for plan approval until they say to update the plan. A message starting with `Q:` is chat-only; one starting with `plan:` goes into the plan.

**Code**
- **Public library APIs only**, in code and tests: no undocumented error fields (e.g. `sqlState`), transitive-only exports or private members. If the public API can't do it, say so and suggest alternatives.
- **Use the library, and keep it simple.** Before hand-writing logic, check whether a library we already use (or a small official extension of it, e.g. Tiptap's `CharacterCount`) does it, and use that. Remove code that isn't needed for correctness, even if it is tidy or was written on purpose. Simple and correct beats thorough. When a helper has to stay because the library can't be reached from where it runs, say why in a comment and guard it with a test against the library. If dropping something would change behaviour (e.g. what a request contains), ask first as usual.
- **Modular, not speculative.** Give real responsibilities and shared logic their own focused module, but add no interfaces or abstractions for hypothetical needs (e.g. no payment gateway interface). Put flexibility where change is expensive: the DB schema. A thin concrete wrapper around an SDK is fine.
- **Small composed functions/files/commits.** Every function, exported or not, reads as a short sequence of well-named steps, one function per outcome. If a body mixes a loop, a branch and a data shape, split it before writing on: pull each decision ("is this start already taken?", "how does this part read?") into its own small function. A switch is only a thin dispatch with one line per case. The same with planning commits/work.
- **Simple ternaries only.** One `? :` per expression, never nested or chained, with a short expression (a name, a call, a literal) on each side. The formatter may wrap it over lines, e.g. `return isFree` / `? this.enrollInFreeCourse(context)` / `: this.recordPendingPayment(context);`. When a branch is a multi-line object, array or JSX block, or you would need a second `?`, use an early `return` per case, `&&` or `??` for a default, or a small named function (or component, in JSX).
- **Flat and immutable by default.** Early returns instead of nesting; `const` with `map`/`filter` instead of `let` and a loop that pushes into an array. A small local `Set` or counter is fine when it is the simplest way to see earlier rows; say why in a comment.
- **Unambiguous labels.** Nest or qualify fields by owner (`customer.name`, not `name` beside `courseId`), in contracts, types and variables.
- **Don't duplicate state.** Don't add a column that duplicates derivable state (e.g. a `currentStatus` beside the append-only status log). Prefer a DB constraint plus a shared query helper; raise denormalization only with a measured performance reason, and name its sync cost.

**Writing**
- **Plain language** in chat, outlines, docs and code comments. Define every specialized term (for example "tick", "sweeper", "outbox"): what it means in the current context, why use it, and the alternatives. Don't assume a term means its usual meaning elsewhere.
- **Diagram file moves.** When a refactor moves or splits files, show one diagram per folder in the outline and again in the hand-off. Put a heading line first, e.g. "`api/src/auth` (16 files → 6 in the folder, plus 2 new sub-folders)", then one code block with the old layout (`BEFORE`) on the left and the new one (`AFTER`) on the right, side by side, files of a new sub-folder listed in the same tree format. Unchanged folders are written as `(unchanged)`. Use `old -> new` arrows only when a single file splits.
- **Copyable commands.** Write any command, slash command or commit message the owner may copy as a single-line inline code span alone on its own line: one pair of backticks, no bullet, label or trailing text, so a double-click selects all of it.
- **Bullets, not blocks.** Outlines, summaries and hand-offs are bullet points, one idea per bullet, not paragraphs.
- **Link files.** Any list of files is markdown links relative to the repo root, e.g. `[types.ts](api/types.ts)`.
- **Search for specific things**; skip wide, open-ended surveys of the codebase. Read a sibling file by line range when you only need a pattern.
