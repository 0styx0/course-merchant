---
name: plan-create-implementation
description: Second planning pass. Design the Next milestone of a design doc, settle its open questions, and split it into well-formed commit lines in the doc for /next-commit to build. Use when a milestone is Next and isn't split into commits yet, or the owner says "plan the next milestone".
model: opus
effort: high
argument-hint: "[module: the name of a docs/<module>.md]"
arguments: [module]
---

# Plan implementation (one milestone)

Module: `$module` (the matching `docs/<module>.md`; empty means "find it from the Next marks below"). This pass designs **one milestone** just before it is built: enough that `/next-commit` can outline and test every commit without reopening a design question, and no more.

**Run in plan mode.** The `model` and `effort` lines above last only for the turn that starts the skill; after that the session's settings apply (`opusplan` gives Opus in plan mode and Sonnet outside it). If plan mode is off, tell the owner to switch it on before you continue.

Facts gathered before you start:

- Next marks: !`grep -n '\*\*Next\*\*' docs/*.md`
- Uncommitted changes: !`git status --short`

## 0. Read now

Read [../_shared/chat-rules.md](../_shared/chat-rules.md), [../_shared/milestone-line.md](../_shared/milestone-line.md), [../_shared/commit-line.md](../_shared/commit-line.md) and [../_shared/commit-size.md](../_shared/commit-size.md). Read [architecture-checklist.md](architecture-checklist.md) at step 4. Follow CLAUDE.md's working agreements throughout.

## 1. Find the milestone and what it builds on

- A milestone flagged `*(spike)*` is planned as one commit line (see step 5).
- **Confirm before working,** unless it is already unambiguous. It is unambiguous when `$module` is given and exactly one milestone of that doc is **Next** and not yet split into commits; then say "Planning module X, step N: title" in one line and go on. Otherwise ask through the picker (AskUserQuestion): the question names the module and the milestone (number and title); options are "Plan this one (Recommended)", one option per other candidate (at most two), and the free-text "Other". Do not read the milestone's code or start designing until the owner answers. If there is no candidate, say so and stop.
- Take the milestone from `docs/<module>.md` and its `## Step N.` section. If it is already split into commits, stop and suggest `/next-commit` with the module name.
- Read its *Builds on* links and open questions, the Principles, Decisions and *Journeys*, and the docs and rules it links.
- Read the code it builds on: what earlier milestones added, and one sibling of each kind of file it will add (by line range). Grep for existing helpers before planning a new one; write down each helper you will reuse.- Mention uncommitted changes (above) in files this milestone touches.

## 2. Check the map still holds

Run `.claude/hooks/run-remeasure.sh docs/<module>.md` (it runs every *Re-measure* command in the doc) and compare with what the section assumes, then look for other new facts since the overview: a library behaving differently than assumed, code that landed differently. For each, follow CLAUDE.md *Push back as information comes in* **before** designing on it. If the map itself is wrong (order, a Principle), say so and ask before changing the Status list.

## 3. Settle the open questions

- Start with the section's *Blocks the split* questions; *Can wait* questions go to the commits' outlines.
- One at a time through the picker, starting with the one that affects the most others.
- Check every library claim in `node_modules` source or official docs (link it); if you can't, say so and give your confidence.
- Leave a question to a commit's outline only if it can be decided inside that commit and no other commit depends on it.

## 4. Design what commits share

Follow architecture-checklist.md. Write down only what more than one commit depends on or what is expensive to change: shared data shapes, module and file boundaries, user-visible behaviour, security and limits. Define each new term once.
- Draw the milestone's flow as in [../_shared/flow-diagram.md](../_shared/flow-diagram.md), then use it to split the commits in step 5.

## 5. Split into commits

Format: commit-line.md. Size: commit-size.md. How to cut:

- **One outcome per commit,** stated first in plain words.
- **Cut by review unit, not by file.** A commit is what the owner can review and revert in one piece. Same-kind changes (moves, renames, lint fixes, test splits) are one mechanical commit per package, not one per file or folder.
- **Something on screen early.** In a milestone with a UI, the first or second commit puts a rough version of the result on a page the owner can open; later commits deepen it. A commit that ends with "nothing uses it yet" is allowed only when the next commit uses it.
- **Order:**
  1. shared definitions the next commit uses (data shapes, helpers, config). A "refactor to share" commit goes right before the commit that needs it, never earlier;
  2. then each slice end to end, thinnest first (a slice = one user-visible behaviour, built through every layer it needs, over a layer built across many slices);
  3. wiring into pages;
  4. browser tests and docs last.
- **Every commit is green and shippable alone:** build, lint and tests pass; nothing is left unused or half-wired that a later commit finishes (unless the line says "not used yet").
- **Tests live in the commit that adds the behaviour.** List the behaviours, naming failure and edge cases, so the outline's table is not invented later. One bullet per behaviour, never a run-on line.
- **Mechanical flag:** for commits that should change no behaviour (definition in [../next-commit/outline.md](../next-commit/outline.md)). If existing tests may not pin the touched lines, say "coverage first".
- **Dependencies:** a line says which commit it needs when the order is not obvious.
- **Folders:** if the commit adds files to a folder that would pass the files-per-folder limit in CLAUDE.md, the line includes the grouping.
- **A spike milestone** is one commit line flagged `*(spike)*`: no tests; the code is deleted or kept only if the answer needs it; it ends with the answer written in the doc and a proposed decision row.
- Leave out exact test code, file contents and names that can be chosen inside one commit.

Say the granularity in one line before the list (for example "7 commits; moves grouped per package"). If unsure how fine to split, ask once. Start from the section's *Size*; a different count is normal (the map sized it before the code was read), so say the new count and why in one line rather than asking, unless the milestone's outcome or order changes. Number the commits (3a, 3b, ...), mark the first **Next**.

## 6. Check the plan before presenting

Call the `plan-reviewer` agent (Agent tool, `subagent_type: plan-reviewer`) with the draft plan and the files it names, and say it is a **commit plan**. It checks module boundaries, missed reuse against twins, order and hidden coupling, missing failure cases, commit size and whether something is on screen early. Report which findings you accept and fix, and which you reject with a reason. Do not relay its full list.

Check what the reviewer cannot see:
- Could `/next-commit` write the test table (happy, failure, edge) from each line and the doc alone?
- Is every decision a line depends on a decision row or an answered question?
- Are its files and the folder counts right (re-grep, do not trust memory)?
- Is its mechanical flag right? Would it still be right if a test were missing?
- Does every branch in the flow diagram have exactly one commit that builds it, and does the sum of commits deliver the milestone and nothing else?

## 7. Present

Bullets only, at most ~600 words (this overrides the word cap in chat-rules.md), in this order so the owner can stop after the second section. In plan mode, present with ExitPlanMode. Outside plan mode, end your reply with the presentation and wait for approval.

1. **Summary:** what the milestone delivers, the commit count and granularity, what changed from the overview.
2. **Questions for you:** anything open (usually none).
3. **Commits:** the lines in the format of commit-line.md, with one nested bullet per file and per behaviour.
4. **Page sketch**, for a milestone that adds or reorders a page, section or field: an ASCII wireframe in one code block with the sections in order (titles and help text), the fields in order, and what shows while the page is empty. It fills in the part of the whole-page sketch in *Journeys*. The owner approves it with the plan.
5. **Flow diagram** ([../_shared/flow-diagram.md](../_shared/flow-diagram.md)), for a milestone with logic, with the commit line that builds each step.
6. **Design notes:** bullets by topic, from step 4.
7. **Proposed decision rows:** the exact `| Decision | Why | Rejected |` text. For each rejected option: what it would give, what it would cost, and its complexity. Only strong contenders. A row deciding what shows, where, or in what order on a page ends its *Why* with "(revisit after use)".
8. **Review result:** one line per accepted or rejected finding.
9. **Terms:** each specialized term the plan uses (CLAUDE.md *Plain language*).

Link and diagram formats: [../_shared/output-format.md](../_shared/output-format.md).

## 8. After approval, write the doc

- Replace the milestone's Status line with its commit lines (first one **Next**), in the layout of commit-line.md. A failure behaviour whose error code or message you cannot name is an open question.
- Extend the existing `## Step N. <milestone>` section (do not add a second one) with the design notes:
  - keep *Done when* and *Builds on*; delete *Re-measure* and *Blocks the split* once answered;
  - mark every design note *(temporary)* so `/next-commit` can cut them when the step ships; a lasting choice goes in a Decision row instead, never in both;
  - put the flow diagram there too, marked *(temporary)*.
- Add the approved decision rows. Move settled questions out of *Open questions*.
- Add a row to the doc's *Changes* log only when the plan changes the order, adds or cuts a milestone, or changes a Principle. A different commit count than the overview's *Size* is not logged; the milestone's *Retro* line records it when the milestone ships.
- Docs only. Hand off with the files changed, `` `docs(<module>): plan step N` `` as the suggested commit message (using the module name), and a reminder to `/clear` before `/next-commit` with the module name.
