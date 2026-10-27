---
name: next-commit
description: Outline the next commit from a design doc's Status, wait for approval, then implement, verify and update the doc. Use when the owner says "next", "next commit", or names a status item to work on.
disable-model-invocation: false
argument-hint: "[module: payments|courses|auth|web] [task]"
arguments: [module]
---

# Next commit

Module: `$module` — one of `payments`, `courses`, `auth`, `web` (the matching `docs/<module>.md`). Anything typed after it is a free-text task: `$ARGUMENTS`. Both are optional. Follow CLAUDE.md's working agreements throughout; this skill is the order of work.

## 1. Find the work

- With no module, read the Status section of each file in `docs/`; with a module, read only the Status of `docs/$module.md`. Take the item marked **Next**. If there is none, or more than one, ask which.
- Read what the item needs: the doc's sections about it, and the files it links.
- Before outlining, look for existing patterns and helpers:
  - read one existing sibling of each kind of file you'll add (for example an existing repository and its integration spec) and follow its conventions;
  - for each helper you think you need, grep for an existing one in `src/common/`, `src/test/` and the modules involved, and reuse it.
- Search for specific things; skip wide, open-ended surveys of the codebase.
- Run `git status --short`. Leave uncommitted changes from other work alone, and mention them if they touch the same files.

## 2. Outline, then stop

Give the outline and wait for the go-ahead. In plan mode, present it with ExitPlanMode; otherwise end your reply with it. Write no code before approval.

- **Heading:** a plain-language sentence saying what the commit does (for example "Send queued emails automatically"), not a class or file name. Clear communication comes first.
- **Terms:** define every specialized term or unit of work the outline uses (for example "tick", "sweeper", "outbox"): what it means here, why use it, and the alternatives. Don't assume a term means its usual meaning elsewhere.
- **What:** each file to add or change, as links, with what changes in it.
- **Why:** the reason this is the next step, and how it fits the design doc.
- **Trade-offs:** the alternatives you considered and why you didn't pick them.
- **Config:** keep module-specific settings (constants or env vars) inside that module, not in global config. If that would add real complexity, tell the owner before doing it.
- **Questions:** any design or behaviour change not already decided in the doc, asked as a question with your recommendation.
- **Tests:** which unit, integration or e2e tests you'll add.
- **Doc update:** what changes in `docs/<area>.md`.

If the owner replies with questions or objections, discuss them first: answer, give your recommendation, and ask follow-ups if needed. Don't edit the outline or write code while the discussion is open. Once the owner agrees on the answers, present the updated outline and wait for the go-ahead again.

## 3. Implement, after approval

- Build exactly what was approved. If something comes up that would change design or behaviour, stop and ask.
- In the same change, update the design doc:
  - tick the item;
  - mark the following item **Next**, with enough detail to start on it;
  - add a decision row for anything decided along the way;
  - when a whole step is done, cut its design notes down to decision rows.
- As the last step of implementation, use a subagent to run `/simplify` (the Skill tool, skill `simplify`) on the change. If a cleanup would change design or behaviour, ask first instead of applying it. Run it before verifying, so step 4 checks the simplified code.

## 4. Verify

From `api/` (or `web/`), run `yarn lint`, `yarn tsc --noEmit`, and the unit tests. Also run the single-file integration or e2e specs for the code you touched, using the `vitest` configs and `test:*` scripts in `package.json`. Report failures with their output; don't hide them.

## 5. Hand off

Keep it short:
- the files changed, as a table links | high level changes;
- the verification results;
- a suggested conventional commit message.

Then stop. The owner makes the commit. If this finished a whole step in the Status, follow the usage-review agreement in CLAUDE.md.
