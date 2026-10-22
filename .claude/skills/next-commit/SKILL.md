---
name: next-commit
description: Outline the next commit from a design doc's Status, wait for approval, then implement, verify and update the doc. Use when the owner says "next", "next commit", or names a status item to work on.
disable-model-invocation: true
---

# Next commit

Arguments (optional): a design doc area (`payments`, `courses`) or a free-text task. Follow CLAUDE.md's working agreements throughout; this skill is the order of work.

## 1. Find the work

- With no argument, read the Status section of each file in `docs/` and take the item marked **Next**. If there is none, or more than one, ask which.
- Read only what that item needs: the doc's sections about it, and the files it links. Don't explore the codebase broadly.
- Run `git status --short`. Leave uncommitted changes from other work alone, and mention them if they touch the same files.

## 2. Outline, then stop

Give the outline and wait for the go-ahead. In plan mode, present it with ExitPlanMode; otherwise end your reply with it. Write no code before approval.

- **What:** each file to add or change, as links, with what changes in it.
- **Why:** the reason this is the next step, and how it fits the design doc.
- **Trade-offs:** the alternatives you considered and why you didn't pick them.
- **Questions:** any design or behaviour change not already decided in the doc, asked as a question with your recommendation.
- **Tests:** which unit, integration or e2e tests you'll add.
- **Doc update:** what changes in `docs/<area>.md`.

## 3. Implement, after approval

- Build exactly what was approved. If something comes up that would change design or behaviour, stop and ask.
- In the same change, update the design doc:
  - tick the item;
  - mark the following item **Next**, with enough detail to start on it;
  - add a decision row for anything decided along the way;
  - when a whole step is done, cut its design notes down to decision rows.

## 4. Verify

From `api/` (or `web/`), run `yarn lint`, `yarn tsc --noEmit`, and the unit tests. Also run the single-file integration or e2e specs for the code you touched (commands are in CLAUDE.md). Report failures with their output; don't hide them.

## 5. Hand off

Keep it short:
- the files changed, as links;
- the verification results;
- a suggested conventional commit message.

Then stop. The owner makes the commit. If this finished a whole step in the Status, follow the usage-review agreement in CLAUDE.md.
