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
- [docs/course-edit.md](docs/course-edit.md) — the admin "edit course" page: prefill, full PUT, schedule and price rules, image, status. Run with `/plan-create-implementation course-edit`.
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

Hooks refuse hand-edits of generated files and whole-file reads of them (they're large): grep for the type or operation name. Both sides alias the generated schemas rather than redefining them: `api/types.ts` (imported as `"types.js"`) and `web/src/lib/types.ts`.

## Conventions

- Conventional commit messages with scopes, e.g. `feat(checkout): …`, `refactor(e2e): …`, `test(fixtures): …`. No `Co-Authored-By` trailer.
  - Write the subject in plain words a newcomer understands, saying what the commit lets the app do, e.g. `feat(course-edit): add the code that loads and saves a course's details`, not `feat(course-edit): add edit's start values and details save action`. No internal function or file names.
- `ignore.md` at the root is a gitignored scratch file, not documentation.
- **A file name states the file's main job.** A small helper the file uses may live beside it. Rename or split the file when it takes on a second job.
- **After a rename, grep for the old name in file names** (tests, siblings, folders) and rename those too.
- **A function name states what it returns.** A function that returns a formatter is `makeDateFormatter`, not `formatDate`.
- **No vague names, for any function, variable, parameter or type.** A reader who sees only the name and its call site must know what it does, when it runs and what it works on.
  - Name the trigger or the object, not a bare verb or noun: `showThrownProblem`, not `showRejected`; `removePriceRow`, not `removeRow`; `extraDetail`, not `note`.
  - Avoid one-word names like `edit`, `apply`, `close`, `convert`, `part`, `failure`, `pick`, `when`, `warn`, `check`, `handle`, `data`.
  - Two things in one codebase never share a name (a type and a component, two `isKnownTimeZone` checks).
  - Before finishing code, reread each new name as a stranger would and rename what needs a comment to be understood.
  - A name that is longer than the line limit allows is shortened by dropping filler words, not by becoming vague (the lint limit is 40 lines per function).
- **At most 10 files per folder**, not counting sub-folders; spec files count. Generated and vendored code (`generated.ts`, `migrations/`, `components/ui/`) doesn't. A hook warns right after you write a file that pushes a folder past it, and the pre-commit hook ([check-folder-file-count.sh](.husky/check-folder-file-count.sh)) fails on it; group the files by job in the same commit that adds the 11th. Split by who uses the files first (create, edit, shared), then by topic. Name the folder for its job (`stripe/`, `fulfillment/`), never `utils/` or `misc/`.
- **Folders group files by topic, so a newcomer can find things by name.**
  - Group files that change together or share a job (the form, the schedule summary, the time zone picker), not by file type or by "what was left over".
  - Don't leave loose files at a feature's root next to its sub-folders; every file belongs to a topic folder.
  - Integration tests that render a whole component go in a `tests/` folder beside it; one-file unit tests stay next to their source.
  - When you add a file, put it in the folder for its topic. If none fits, create one named for the job, and split a full folder by topic, not alphabetically.
- **Labels:** milestone `3`, commit `3b`; never a deeper level (`3b-i`). Split a commit by re-lettering the rest.
- To move files, move parent folders before their children; steps are in [api/CLAUDE.md](api/CLAUDE.md#moving-and-renaming-files).

## Working agreements

How the owner wants Claude to work on this repo.

**Workflow**
- **One commit at a time.** Before coding a commit, give an outline and wait for the go-ahead. Outline formats (full, and the short one for **mechanical** and **plan-conformant** commits, both defined there) are in [outline.md](.claude/skills/next-commit/outline.md). Then implement, verify (type check and the relevant tests), and stop with a suggested conventional commit message. The owner makes the commits. Finish one commit's changes before starting the next: interactive `git add -p` isn't available, so mixed hunks can't be split. `/next-commit` ([skill](.claude/skills/next-commit/SKILL.md)) runs this routine from the **Next** item in `docs/`.
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
- Code rules (library APIs, siblings, small functions, ternaries, immutability, labels, duplicated state) are in [.claude/rules/code.md](.claude/rules/code.md); they load when you read or write a source file in `api/src/` or `web/src/`. Read it first if you write code without reading a source file.

**Writing**
- **Plain language** in chat, outlines, docs and code comments. Define every specialized term (for example "tick", "sweeper", "outbox"): what it means in the current context, why use it, and the alternatives. Don't assume a term means its usual meaning elsewhere.
- **Don't coin terms.** Never reuse a domain word (start, schedule, price, status) for something else. If a new term is unavoidable, define it in the same message where it first appears, and use it in code only if the name says the same thing.
- **Explain a design by what would go wrong without it**, for a user or a developer, in one sentence. If that sentence needs type-system terms, say so and reconsider the design before defending it.
- **Say what and why before how.** Every outline, hand-off and doc status line starts with what the admin, customer or developer can now do; code names come after. Status lines in `docs/` name no functions.
- **Relaying a subagent or tool:** restate its findings in your own words. Never quote its phrases or process words unexplained.
- **Copyable commands.** Write any command, slash command or commit message the owner may copy as a single-line inline code span alone on its own line: one pair of backticks, no bullet, label or trailing text, so a double-click selects all of it.
- **Bullets, not blocks.** Outlines, summaries and hand-offs are bullet points, not paragraphs. One bullet is one idea: one short sentence, plus a second sentence when it gives the reason ("because…", "so…"). A sentence that joins two separate steps with "and", "then" or a semicolon is split into sub-bullets under a bullet that names the subject, e.g. "`uploadCourseImageAction` does three things:" followed by one sub-bullet each.
- **Output formats** (file-move diagrams, flow diagrams, how to link files) are in [.claude/skills/_shared/output-format.md](.claude/skills/_shared/output-format.md).
- **Search for specific things**; skip wide, open-ended surveys of the codebase. Read a sibling file by line range when you only need a pattern.
