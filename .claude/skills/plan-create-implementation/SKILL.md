---
name: plan-create-implementation
description: Second planning pass. Design the Next milestone of a design doc, settle its open questions, and split it into one-line commits in the doc for /next-commit to build. Use when a milestone is Next and isn't split into commits yet, or the owner says "plan the next milestone".
disable-model-invocation: false
argument-hint: "[module: payments|courses|auth|web|course-creation]"
arguments: [module]
---

# Plan implementation (one milestone)

Module: `$module` (the matching `docs/<module>.md`). With no module, reuse the one in the memory file `project-next-commit-module.md`, and say which one you picked. When a module is given, update that file. Follow CLAUDE.md's working agreements throughout. This pass designs **one milestone**, just before it's built: enough for every commit in it to be outlined by `/next-commit` without reopening design questions, and no more. Per-commit detail (exact tests, file contents) stays with `/next-commit`.

## Chat rules (this whole skill)

- Replies are at most ~150 words. Recommendation first, then the one reason that matters most. Offer more rather than writing it.
- One decision at a time, through the question picker (AskUserQuestion): 2–4 options, the recommended one first and labelled, each with a one-line consequence.
- Answer what was asked; collect new topics for the presentation instead of raising them mid-discussion.
- Every library mentioned gets a link to its docs.

## 1. Find the milestone and what it builds on

- In `docs/$module.md`, take the **Next** milestone. If it's already split into commits, stop and suggest `/next-commit $module`.
- Read its open questions, the Principles and Decisions, and the docs and specs it links.
- Read the code it builds on: the files the earlier milestones added, and one sibling of each kind of file it will add (by line range when you only need a pattern). Grep for existing helpers before planning new ones. Search for specific things; no open-ended surveys. Never read generated files whole.
- Run `git status --short` and mention uncommitted changes in files this milestone touches.

## 2. Check the map still holds

Look for new information since the overview: a library behaving differently from what the doc assumed, code that landed differently, a decision a later finding undermines. For each one, say what changed, why the decision may no longer hold, and your recommendation, **before** designing on top of it. The owner decides.

## 3. Settle the open questions

- One at a time, through the picker, starting with the one whose answer affects the most others.
- Check every library claim in `node_modules` source or official docs (link it). If you can't check it, say so and give your confidence.
- Don't invent new questions to fill space. If something can safely be decided inside one commit, leave it to that commit's `/next-commit` outline.

## 4. Design only what commits share

Write down only what more than one commit depends on, or what's expensive to change later:
- contract and database shape (described in words; the contract itself is changed in a commit);
- module and file boundaries: what lives where, and the names of shared things;
- behaviour the user sees: validation timing, error messages and their placement, empty and loading states;
- security and limits.

Define each new term once, in plain language.

## 5. Split into commits

- Each commit is one line, starting with what it achieves, then its main files or parts in brackets (e.g. "**3b.** The error list at the top of the form (`error-summary.tsx`)").
- One concern per commit. If a line needs "and" to join unrelated parts, split it. As a rough guide: a commit that touches more than ~6 files or both `api/` and `web/` is probably two commits.
- Each commit leaves the build and tests passing, and includes its own tests.
- Order: foundations (contract, helpers) first, then pieces, then wiring them into the page, then browser tests and docs.
- Number them under the milestone (3a, 3b, …), and mark the first **Next**.

## 6. Present (at most ~700 words)

In plan mode, present it with ExitPlanMode; otherwise end your reply with it. Sections, in this order, so the owner can stop reading after the second:

1. **Summary:** 3 bullets: what the milestone delivers, how many commits, and anything that changed from the overview.
2. **Questions for you:** anything still open (usually none after step 3).
3. **Commits:** the one-line list.
4. **Design notes:** short paragraphs by topic, from step 4.
5. **Proposed decision rows:** the exact `| Decision | Why | Rejected |` text, for approval.
6. **Terms:** only if the notes use one the owner may not know.

If the owner asks for a review, give a subagent only this plan plus the files it names, and ask for the **top 3 must-fix problems in ≤200 words**. Pass them on briefly and say which you agree with. Don't relay the full list.

## 7. After approval, write the doc

- Replace the milestone's Status line with its numbered commits (the first marked **Next**), add a `## Step N. <milestone>` section with the design notes, add the approved decision rows, and move settled questions out of *Open questions*.
- Docs only, no code. Hand off with the files changed, a suggested conventional commit message (`docs($module): plan step N`), and a reminder to `/clear` before `/next-commit $module`.
