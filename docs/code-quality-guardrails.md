# Code quality guardrails

Read this before changing lint rules, the pre-commit or pre-push hooks, or the rules in CLAUDE.md about code style, names and layout. It follows [code-style-cleanup.md](code-style-cleanup.md): that cleanup rewrote about 18 commits of code to match style rules that were written after the code. This area makes tools enforce those rules so no second cleanup is needed. Run it with `/plan-create-implementation code-quality-guardrails`, then `/next-commit code-quality-guardrails`.

Keep this file current **in the same commit as the work**: tick the step, mark the next one **Next**.

## Status

Each milestone delivers one outcome. A milestone is split into one-line commits by `/plan-create-implementation` when it becomes **Next**.

- [x] **1. Style rules enforced by lint.** Turn on the rules in *Numbers* as errors, after fixing the code that breaks them (details in *Step 1*). Lint already runs on commit through lint-staged, so a violation blocks the commit. Two commits:
  - [x] **1a.** API: flatten `toFieldErrorCode` (`zod-validation.pipe.ts`, complexity 11), split the 21 spec files over 250 lines by topic (10 unit, 7 integration, 4 e2e), then turn the API rules on (`api/eslint.config.mjs`).
  - [x] **1b.** Web: flatten `toFormPath` (`field-errors-from-problem.ts`, complexity 13), split `FormField` and `ErrorSummary` (`components/form/`), `CourseForm`, `InputField`, `BasicsSection`, `ScheduleSection`, `DescriptionEditor`, `DescriptionLinkField` and `DescriptionToolbar`, split `course-form.test.tsx` and `course-form-schema.test.ts` by topic, then turn the web rules on (`web/eslint.config.mjs`) and tick this step.
- [x] **2. Unused-code check.** Add [knip](https://knip.dev) (finds unused files, exports and dependencies), clean up what it reports, then enforce it on pre-push and CI (details in *Step 2*). Two commits:
  - [x] **2a.** API: add knip (`api/knip.jsonc`, `api/package.json`), remove what it reports (unused exports, `pg`, `@eslint/eslintrc`, the value import of `express`), then run `yarn --cwd api knip` on pre-push and in CI's `api` job; update the hook table in [CONTRIBUTING.md](../CONTRIBUTING.md).
  - [x] **2b.** Web: the same for `web/` (`web/knip.jsonc`, about 5 files under `web/src`, the unused `strict-event-emitter` dev dependency), knip in pre-push and CI's `web` job, CONTRIBUTING, and tick this step.
- [x] **3. Behaviour pinned before refactors.** Use the existing `@vitest/coverage-v8` (both packages already have it) to see which lines a refactor touches that no test runs, and make the `next-commit` skill check it first (details in *Step 3*). Two commits:
  - [x] **3a.** A `test:coverage` script in each package (`api/package.json`, `web/package.json`), replacing the API's `test:cov`, and the command in [api/CLAUDE.md](../api/CLAUDE.md) and [web/CLAUDE.md](../web/CLAUDE.md); each script run once to confirm it works.
  - [x] **3b.** A step in the `next-commit` skill (`.claude/skills/next-commit/SKILL.md`): check coverage of the touched code first, and add a missing test in its own commit before the refactor.
- [ ] **4. Naming and layout rules.** Fix the 9 folders over 7 files first, one commit per package, then write the rules (details in *Step 4*). Three commits:
  - [x] **4a.** Web layout: `admin-courses` split into `price/`, `schedule/`, `validation/` and `save-course/`; its `description-editor/link/`; `courses/description/` and `courses/list/`; the shared description format moved to `features/course-description/`; `lib/api/config/`.
  - [ ] **4b.** **Next.** API layout: `api/src/auth` (16), `api/src/courses` (13), `api/src/courses/test/unit` (11, grouped by topic), `api/src/email` (9) and `api/src/prisma` (8). Same outline rules.
  - [ ] **4c.** The naming and layout rules in CLAUDE.md (see *Principles*), plus the one-line amendment in [api-tests.md](../.claude/rules/api-tests.md) allowing topic sub-folders under `test/unit/`. Docs only; review with the owner again before starting.
  Goal: Claude should output high quality and correct code. Check if the file splits affect quality (claude might not know to check in the smaller more modular files or navigate efficiently)
- [ ] **5. Short outlines for mechanical steps.** Change the `next-commit` skill and CLAUDE.md: moves, renames, splits, doc-only and lint-fix commits get a short outline and no wait for approval.
- [ ] **6. Close the cleanup.** Cut [code-style-cleanup.md](code-style-cleanup.md) down to its decision rows (or delete it), remove it from the `next-commit` hint and the CLAUDE.md doc list, fix the saved next-commit memory, and add the cleanup row to the usage-reviews memory.

## Principles

- **A tool beats a sentence.** A rule goes into ESLint when a tool can check it; CLAUDE.md keeps only what a tool can't check (names, layout, design).
- **Fix first, then enforce.** A rule goes on as an error only after the code passes it. A warning nobody reads is no rule.
- **Rules apply to hand-written code, tests included.** Generated files and vendored `components/ui/` (shadcn) are exempt. The one rule tests skip is the 40-line function limit (see *Decisions*).
- **No number without a reason.** Every limit has a row in *Numbers* saying where it came from and what was measured, and a comment beside it in the config.
- **Names say what they hold.** A file name states everything the file exports. A function name states what it returns (the old `formatDate` returned a formatter, not a date).
- **At most 7 files in a folder**, not counting sub-folders. Past that, group the files by job (as `payments/` was split into `stripe/`, `fulfillment/` and `sweeper/`). A guideline, not checked by a tool.
- **Pin behaviour before a refactor.** A refactor that changes no behaviour is only safe if a test would fail when it does.

## Numbers

Measured on 2026-10-29 with the proposed rules run over `api/src` and `web/src`. Lines are counted without blanks and comments.

| Rule | Value | Where it comes from | Measured |
|---|---|---|---|
| Function length (`max-lines-per-function`) | 40 | The target in the cleanup doc (step 12): a function that fits one editor screen needs no scrolling. | API `src`: 0 over. Web `src`: 10 over; several are JSX components, some are vendored `components/ui/`. |
| Nesting depth (`max-depth`) | 3 | The *Flat and immutable* rule: one loop, one `if` and one body. | 0 over. |
| Complexity (`complexity`) | 10 | McCabe's 1976 paper proposed 10 as the limit. ESLint's rule counts the same thing (independent paths through a function). | 3 over (API 1, web 2). |
| File length (`max-lines`) | 250 | No principled source. Chosen just above the largest hand-written file, so it stops growth without forcing rewrites. | 0 over in hand-written `src`; only a generated file exceeds it. |
| Nested ternary (`no-nested-ternary`) | error | Backs the *Simple ternaries only* rule. | 1 in API tests (fixed in 1a), 0 elsewhere in `src`. |
| Files per folder | 7 | The owner's choice. The cleanup split `admin-courses/` (30 files) and `payments/`; 7 is about one screen of a file tree. | 9 folders over today (recounted before milestone 4; step 1's test splits fixed `test/e2e/courses` and `test/integration`): `web/src/features/admin-courses` 28, `web/src/features/courses` 16, `api/src/auth` 16, `api/src/courses` 13, `api/src/courses/test/unit` 11, `web/src/lib/api` 10 (9 without `generated.ts`), `api/src/email` 9, then 8 each in `description-editor` and `api/src/prisma`. |
| Coverage threshold | none | The owner chose not to set one: a threshold invites tests written to hit the number. Coverage is used as a check before a refactor only. | Not measured yet. |
| Short outline | about 5 lines | Enough to name the files and the check, short enough that "go" is a quick read. | n/a |

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| Rules go on as errors, after the code is fixed. | A warning nobody reads is the same as no rule. | Warn-only; a baseline file of known violations (an extra tool and file to maintain). |
| Tests follow the file-length (250), nesting and complexity limits, but not the 40-line function limit. Generated files and `components/ui/` skip the length rules. | Tests should meet the same bar as source. ESLint's rule can't exempt `describe` callbacks, which are long by design (119 of 140 hits in API tests). The other two aren't hand-written. | Exempting tests entirely; a custom rule for `it` bodies (21 hits, not worth the rule code). |
| Test files over 250 lines are split by topic, with the same tests before and after. | Keeps the change a move, not a rewrite. | Trimming tests to fit. |
| Each package turns its rules on in its last commit, and the work is one commit per package. | Lint is never red between commits; about 40 files in one diff can't be reviewed. | Warnings first; one commit for everything. |
| Function length 40. | See *Numbers*. | 30 (flags code the cleanup left alone); 60 (catches only real outliers). |
| New dev dependencies are allowed when small and official (`@vitest/coverage-v8`, knip). | They replace manual checks. | No new dependencies. |
| Mechanical steps get a short outline: moves, renames, splits, doc-only and lint-fix commits. | None of them change runtime behaviour; about 15 "go" turns in the cleanup were only approval. | Full outlines for everything. |
| No coverage threshold. | See *Numbers*. | A percentage gate. |
| 7 files per folder is a guideline, not a test. | A test would block commits over a judgement call. | A tiny test that counts files. |
| The 9 folders over 7 files are fixed now, in milestone 4. | A rule the code already breaks gets ignored. This is the same "fix first, then enforce" principle as the lint rules. | Applying the rule only to folders touched from now on. |
| Spec files count toward the 7. | The reason is scanning a file tree, and a tree full of specs is as hard to scan as one full of source. | Counting only source files. |
| Coverage before a refactor is checked with a `test:coverage` script per package (unit tests only in the API); the old API `test:cov` is removed. | One short command that both the guides and the skill can name. It needs no database, and there is only one coverage script per package. | The raw vitest command in the docs (long flags that are easy to get wrong); a whole-package report (noisy). |
| knip runs on pre-push and in CI, not on commit. | It checks the whole project; a half-done refactor can leave an export briefly unused between commits. | Pre-commit (blocks valid in-between commits). |
| One knip config per package; false positives go in its `entry`, `ignore` or `ignoreBinaries`, each with a reason. Generated files and `components/ui/` are ignored. | Matches the two independent yarn projects and the lint exemptions. | A root workspace config (they aren't yarn workspaces); `ignoreExportsUsedInFile` (hides exports that should just not be exported). |
| Layout fixes are one commit per package (4a web, 4b api), not one per folder. | The owner chose it: fewer "go" turns, and each commit is a pure move. The cost is a large diff and no revert of a single folder. | One commit per folder (9 commits); one commit for everything (mixes `api/` and `web/`). |
| Parent folders move before their children (`admin-courses` before `description-editor`, `courses` before `courses/test/unit`). | A child's contents depend on where its parent's files go. | Children first (they would move twice). |
| Specs under `test/unit/` may be grouped into topic sub-folders. | `courses/test/unit` has 11 entries. Topic folders keep the "unit specs live in `<module>/test/unit/`" rule and the 7-file limit together. | Mirroring the source sub-folders (ties the test layout to the source layout); exempting `test/` folders (contradicts "spec files count"). |
| The rules are written last (4c), after the folders obey them. | "Fix first, then enforce". | Writing the rules first. |

## Step 1. Style rules enforced by lint

**Rules.** Each package gets `max-lines` 250, `max-depth` 3, `complexity` 10 and `no-nested-ternary`, for source and tests. `max-lines-per-function` 40 applies to source only. Blank lines and comments are not counted. Generated files and `components/ui/` skip the length rules. Each limit has a comment citing *Numbers*.

**Order inside a commit.** Fix the code, then turn the rules on last, so lint is never red.

**Test splits.** Split by topic into sibling files, with no change to what is tested. The files from one split (the specs, plus a `<name>.fixtures.ts` for shared helpers) go together in a sub-folder named after the original spec, e.g. `courses/test/unit/course-request-schemas/`. This keeps the parent folder under the 7-file guideline and shows at a glance which specs belong together. The test count before and after must match; the hand-off reports it.

**Left unchecked.** 21 API `it` bodies are over 40 lines; the function limit skips tests, so they stay.

## Step 2. Unused-code check

**Measured report** (knip 6.41.0, run with `npx` on 2026-10-29, no repo changes). The feared false positives from Nest decorators and Next's file-based routes did not appear. The real ones are different:
- API: 12 "unused" files (10 Prisma migrations, `set-admin-password.ts`, `contract.prisma`), `@inquirer/password` (used by the CLI), `dotenv run` read as a binary called `run`, and `ErrorCodeCourse.INVALID_COURSE_ID` (used through the merged `ErrorCode`). The 4 duplicate exports in `course-field-schemas.ts` are deliberate aliases.
- API, real: unused dependencies `pg` (Prisma's own package already depends on it) and `@eslint/eslintrc`; `express` imported as a value in `problem-details.filter.ts` but not listed (the other eight imports are `import type`); 11 unused exports and 2 unused alias types in `types.ts`.
- Web, real: dev dependency `strict-event-emitter` and about 6 unused exports or types. Hits in `components/ui/` (vendored) and `generated.ts` (generated) are ignored.

**Config.** `api/knip.jsonc` and `web/knip.jsonc`. Migrations, the CLI and the contract become `entry` files; `run` goes in `ignoreBinaries`; the deliberate aliases get knip's `@alias` JSDoc tag. The files are `.jsonc` so each setting carries its reason as a comment. Setting `entry` replaces knip's defaults, so `src/main.ts` is listed too.

**Clean-up rule.** An export used only in its own file loses `export`; one used nowhere is deleted; an unused dependency is removed. The enum hit is fixed by using `ErrorCodeCourse.INVALID_COURSE_ID` in the pipe, as its siblings do.

**Version.** Pin knip to `6.41.0`, the newest release older than two weeks.

**Verification.** `yarn knip`, lint, type check, the package's unit tests; 2a also runs `yarn build`, the integration and e2e suites (removing `pg` must not break the database connection).

## Step 3. Behaviour pinned before refactors

The commands are in [api/CLAUDE.md](../api/CLAUDE.md) and [web/CLAUDE.md](../web/CLAUDE.md); the rule is in step 1 of the `next-commit` skill.

**Already pinned.** The order of the description error list (all bad text, then all bad links) is pinned by "lists every bad text first, then every bad link" in [course-description-schema.spec.ts](../api/src/courses/test/unit/course-description-schema.spec.ts), so no new test is needed.

**Flaky test.** One web test failed on the first coverage run and passed on the rerun, probably a timing flake under coverage load. Not identified yet; note it if it recurs.

## Step 4. Naming and layout rules

**Layout commits (4a, 4b).** Pure moves: `git mv`, then `yarn tsc --noEmit` lists the broken imports, then fix doc paths (`docs/`, ARCHITECTURE.md, README). No content changes. Each folder is grouped by job, with a folder name that says the job (as `stripe/`, `fulfillment/`), never `utils/` or `misc/`. Folders are outlined with before/after trees and need the owner's OK. Generated and vendored code (`generated.ts`, `migrations/`, `components/ui/`) is not counted. The test count before and after must match; the hand-off reports it.

**Test specs.** A spec split by topic keeps its sub-folder named after the original spec; in `courses/test/unit/` those sub-folders are grouped further by topic (for example service, schemas, image).

**Rules (4c).** Short rules in CLAUDE.md for what lint can't check: a file name states everything the file exports; a function name states what it returns; at most 7 files per folder, spec files included; group by job.

## Open questions

- **Milestone 4:** how to group each folder is settled folder by folder in each outline.

## Out of scope

- New features and rewriting code that already passes.
- A coverage percentage gate.
- A tool that checks folder size.
- Folders over 7 files that appear in generated or vendored code (`migrations/`, `components/ui/`, generated types).
