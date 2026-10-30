---
name: plan-create-implementation
description: Second planning pass. Design the Next milestone of a design doc, settle its open questions, and split it into well-formed commit lines in the doc for /next-commit to build. Use when a milestone is Next and isn't split into commits yet, or the owner says "plan the next milestone".
disable-model-invocation: false
argument-hint: "[module: the name of a docs/<module>.md]"
arguments: [module]
---

# Plan implementation (one milestone)

Module: `$module` (the matching `docs/<module>.md`). Follow CLAUDE.md's working agreements throughout, and the chat rules in [../_shared/chat-rules.md](../_shared/chat-rules.md). This pass designs **one milestone** just before it is built: enough that `/next-commit` can outline and test every commit without reopening a design question, and no more.

## 1. Find the milestone and what it builds on

- A milestone flagged `*(spike)*` is planned as one commit line (see [commit-lines.md](commit-lines.md)).
- Take the **Next** milestone from `docs/$module.md` and its `## Step N.` section (format: [../_shared/milestone-line.md](../_shared/milestone-line.md)). If it is already split into commits, stop and suggest `/next-commit $module`.
- Read its *Builds on* links and open questions, the Principles and Decisions, and the docs and rules it links.
- Read the code it builds on: what earlier milestones added, and one sibling of each kind of file it will add (by line range). Grep for existing helpers before planning a new one; write down each helper you will reuse. Search for specific things. Never read generated files whole.
- Run `git status --short`; mention uncommitted changes in files this milestone touches.

## 2. Check the map still holds

Run each *Re-measure* command and compare with what the section assumes, then look for other new facts since the overview: a library behaving differently than assumed, code that landed differently. For each, say what changed, why the decision may no longer hold, and your recommendation, **before** designing on it. The owner decides. If the map itself is wrong (order, size, a Principle), say so and ask before changing the Status list.

## 3. Settle the open questions

- Start with the section's *Blocks the split* questions; *Can wait* questions go to the commits' outlines.
- One at a time through the picker, starting with the one that affects the most others.
- Check every library claim in `node_modules` source or official docs (link it); if you can't, say so and give your confidence.
- Leave a question to a commit's outline only if it can be decided inside that commit and no other commit depends on it.

## 4. Design what commits share

Follow [architecture-checklist.md](architecture-checklist.md). Write down only what more than one commit depends on or what is expensive to change: shared data shapes, module and file boundaries, user-visible behaviour, security and limits. Define each new term once.

## 5. Split into commits

- Format and rules: [commit-lines.md](commit-lines.md) and the format in [../_shared/commit-line.md](../_shared/commit-line.md).
- Size: [../_shared/commit-size.md](../_shared/commit-size.md). Say the granularity in one line before the list (for example "7 commits; moves grouped per package"). If unsure how fine to split, ask once.
- Start from the section's *Size*. If the milestone needs fewer than 2 or more than 5 commits, tell the owner the map was off and ask whether to re-cut it.
- Number them (3a, 3b, ...), mark the first **Next**.

## 6. Check the plan before presenting

Run the self-check in [review.md](review.md): every line dry-run through the size check and the test-table question, folder counts, order. Fix what fails. Then the subagent review in the same file when it applies.

## 7. Present

Use [present.md](present.md). In plan mode present with ExitPlanMode; otherwise end your reply with it.

## 8. After approval, write the doc

- Replace the milestone's Status line with its commit lines (first one **Next**). Extend the existing `## Step N. <milestone>` section (do not add a second one) with the design notes: keep *Done when* and *Builds on*, delete *Re-measure* and *Blocks the split* once answered, and mark notes that are only for building as *(temporary)* so `/next-commit` can cut them later. Add the approved decision rows. Move settled questions out of *Open questions*.
- If the plan differs from the overview (an order change, a milestone added, cut or re-sized), add a row to the doc's *Changes* log.
- Docs only. Hand off with the files changed, `` `docs($module): plan step N` `` as the suggested commit message, and a reminder to `/clear` before `/next-commit $module`.
