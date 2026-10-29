# Code quality guardrails

Read this before changing lint rules, the pre-commit or pre-push hooks, or the rules in CLAUDE.md about code style, names and layout. It follows [code-style-cleanup.md](code-style-cleanup.md): that cleanup rewrote about 18 commits of code to match style rules that were written after the code. This area makes tools enforce those rules so no second cleanup is needed. Run it with `/plan-create-implementation code-quality-guardrails`, then `/next-commit code-quality-guardrails`.

Keep this file current **in the same commit as the work**: tick the step, mark the next one **Next**.

## Status

Each milestone delivers one outcome. A milestone is split into one-line commits by `/plan-create-implementation` when it becomes **Next**.

- [ ] **1. Style rules enforced by lint.** **Next.** Turn on the rules in *Numbers* below as errors, after fixing the code that breaks them (about 10 web functions, 3 functions over the complexity limit, none in API `src` for length). Lint already runs on commit through lint-staged, so a violation blocks the commit.
- [ ] **2. Unused-code check.** Add [knip](https://knip.dev) (finds unused files, exports and dependencies). Report first, clean up, then enforce on pre-push and CI. Riskiest unknown: false positives from Nest decorators and Next's file-based routes, so it goes early.
- [ ] **3. Behaviour pinned before refactors.** Use the existing `@vitest/coverage-v8` (both packages already have it) to see which lines a refactor touches that no test runs. Add a step to the `next-commit` skill for refactors: check coverage of the touched code first, and add a test in its own commit if it is missing. Add the missing test for the order of the description error list, which the cleanup changed without a test failing.
- [ ] **4. Naming and layout rules.** Short rules in CLAUDE.md for what lint can't check (see *Principles*), including 7 files per folder. Then fix the 11 folders that already break it (listed in *Numbers*), one layout commit per folder, each outlined with before/after file trees and needing the owner's OK.
- [ ] **5. Short outlines for mechanical steps.** Change the `next-commit` skill and CLAUDE.md: moves, renames, splits, doc-only and lint-fix commits get a short outline and no wait for approval.
- [ ] **6. Close the cleanup.** Cut [code-style-cleanup.md](code-style-cleanup.md) down to its decision rows (or delete it), remove it from the `next-commit` hint and the CLAUDE.md doc list, fix the saved next-commit memory, and add the cleanup row to the usage-reviews memory.

## Principles

- **A tool beats a sentence.** A rule goes into ESLint when a tool can check it; CLAUDE.md keeps only what a tool can't check (names, layout, design).
- **Fix first, then enforce.** A rule goes on as an error only after the code passes it. A warning nobody reads is no rule.
- **Rules apply to hand-written code.** Tests, generated files and vendored `components/ui/` (shadcn) are exempt from the length rules.
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
| Complexity (`complexity`) | 10 | McCabe's 1976 paper proposed 10 as the limit. ESLint's rule counts the same thing (independent paths through a function). | 3 over. |
| File length (`max-lines`) | 250 | No principled source. Chosen just above the largest hand-written file, so it stops growth without forcing rewrites. | 0 over in hand-written `src`; only a generated file exceeds it. |
| Nested ternary (`no-nested-ternary`) | off | Backs the *Simple ternaries only* rule. | 0 in `src`. |
| Files per folder | 7 | The owner's choice. The cleanup split `admin-courses/` (30 files) and `payments/`; 7 is about one screen of a file tree. | 11 folders over today: `web/src/features/admin-courses` 30, `web/src/features/courses` 16, `api/src/auth` 16, `api/src/courses/test/unit` 16, `api/src/courses` 13, `web/src/lib/api` 10, `api/src/email` 9, then 8 each in `description-editor`, `api/src/test/e2e/courses`, `api/src/prisma` and `api/src/courses/test/integration`. |
| Coverage threshold | none | The owner chose not to set one: a threshold invites tests written to hit the number. Coverage is used as a check before a refactor only. | Not measured yet. |
| Short outline | about 5 lines | Enough to name the files and the check, short enough that "go" is a quick read. | n/a |

## Decisions

| Decision | Why | Rejected |
|---|---|---|
| Rules go on as errors, after the code is fixed. | A warning nobody reads is the same as no rule. | Warn-only; a baseline file of known violations (an extra tool and file to maintain). |
| Length rules skip tests, generated files and `components/ui/`. | A `describe` callback is naturally long (140 hits in API tests alone); the other two aren't hand-written. | Counting tests. |
| Function length 40. | See *Numbers*. | 30 (flags code the cleanup left alone); 60 (catches only real outliers). |
| New dev dependencies are allowed when small and official (`@vitest/coverage-v8`, knip). | They replace manual checks. | No new dependencies. |
| Mechanical steps get a short outline: moves, renames, splits, doc-only and lint-fix commits. | None of them change runtime behaviour; about 15 "go" turns in the cleanup were only approval. | Full outlines for everything. |
| No coverage threshold. | See *Numbers*. | A percentage gate. |
| 7 files per folder is a guideline, not a test. | A test would block commits over a judgement call. | A tiny test that counts files. |
| The 11 folders over 7 files are fixed now, in milestone 4. | A rule the code already breaks gets ignored. This is the same "fix first, then enforce" principle as the lint rules. | Applying the rule only to folders touched from now on. |
| Spec files count toward the 7. | The reason is scanning a file tree, and a tree full of specs is as hard to scan as one full of source. | Counting only source files. |

## Open questions

- **Milestone 1:** which of the web functions over 40 lines are really components that should be split, and which are vendored (exempt)? Settle in the outline.
- **Milestone 4:** how to group each folder (by job, as `payments/` was); settled folder by folder in each outline. `api/src/courses/test/unit` (16 specs) may need to mirror the source sub-folders, which conflicts with the "unit specs live in `<module>/test/unit/`" rule in [api-tests.md](../.claude/rules/api-tests.md); raise it in that outline.

## Out of scope

- New features and rewriting code that already passes.
- A coverage percentage gate.
- A tool that checks folder size.
- Folders over 7 files that appear in generated or vendored code (`migrations/`, `components/ui/`, generated types).
