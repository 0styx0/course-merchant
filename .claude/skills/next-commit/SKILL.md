---
name: next-commit
description: Outline the next commit from a design doc's Status, build it in the background while the owner reviews the outline, then hand off once they approve. Use when the owner says "next", "next commit", or names a status item to work on.
model: opusplan
effort: low
argument-hint: "[module: the name of a docs/<module>.md] [task]"
arguments: [module]
---

# Next commit

Module: `$module` — the name of a `docs/<module>.md` that has a Status section. `$ARGUMENTS` is the module followed by an optional free-text task; the task is everything after the module name. Both are optional; with no module, the **Next** items of all docs are listed (*Find the work*).

Next marks across the docs: !`grep -n '\*\*Next\*\*' docs/*.md` Follow CLAUDE.md's working agreements (especially *When to stop and ask* and *Writing*) throughout; this skill is only the order of work.

## Checklist

Every item below happens, in this order.

**Exemptions:** only pure moves, renames and doc-only commits skip the tests-first step and `/simplify` (item 6) and the reviews in *Build*. A commit's size is never an exemption.

1. Read [outline.md](outline.md), [quality.md](quality.md) and [handoff.md](handoff.md) now.
2. Run the size check and the coverage check (changes that alter no behaviour) as real tool calls. Start the coverage run with `run_in_background` as soon as the touched files are known, keep reading, and read its result before writing the outline.
3. Settle every open choice: take each recommendation the outline's *Questions* make; when a question has no recommendation or has several equally good options, ask through the picker (AskUserQuestion) before sending the outline.
4. Send the outline as [outline.md](outline.md) says, then start the build at once in a background subagent (*Build*), in the same turn. Tell the owner the build runs while they review.
5. Wait for the owner's reply. Show nothing of the build (no code, test results or hand-off) until they approve the outline.
6. In the build: write the tests first and show them failing, run the newcomer-reader, then `/simplify` and the reviews in subagents, verify.
7. After approval, run `git diff --cached --name-only`. Staged but uncommitted changes stop the hand-off: tell the owner which files wait, ask them to commit those first, and hand off once they have. Otherwise hand off as [handoff.md](handoff.md) says.

## Find the work

- With a module, read only the Status of `docs/$module.md`. With none, use the Next marks listed above; if one doc has a **Next** item take it; otherwise ask through the picker (AskUserQuestion): one option per doc with a **Next** item (at most 4; drop prose matches that aren't status items), each labelled with the module and item number and described in one line, the most buildable one first and marked "(Recommended)". Take the item marked **Next**.
- Ask through the picker instead of guessing when: there is no **Next** item in the module (options: the other docs' **Next** items); or the free-text task contradicts the **Next** item (options: the **Next** item, the free-text task).
- If the **Next** item is a milestone not yet split into commits, invoke the `plan-create-implementation` skill (Skill tool, passing the module name as the argument) instead of stopping. Once it finishes, stop: its hand-off tells the owner what to review and when to `/clear` before `/next-commit`.
- Read the item's commit line (format: [../_shared/commit-line.md](../_shared/commit-line.md)): its Behaviours seed the test table, Settled lists the decisions already made, Done when is the verification. If the line lacks these, say so in the outline.
- Read what the item needs: the doc's sections about it, and the files it links.
- Look for existing patterns and helpers before outlining: read one sibling of each kind of file you'll add, and grep for an existing helper before planning a new one.
- Send independent reads in one message and stop reading once the outline can be written.- Run the size check in [../_shared/commit-size.md](../_shared/commit-size.md) now that you have read the code. If it fails, stop as it says. The one exception: when only the 6-file condition fails and splitting would leave a half-wired commit, put the file count and the reason under *Questions* with a recommendation; the owner's approval of the outline covers it, and the hand-off repeats it under *Deviations*.
- Decide whether the commit is **mechanical** (rule in [outline.md](outline.md)); the line's *(mechanical)* flag is only a hint. For a change that alters no behaviour, run `test:coverage` on the files you'll touch (commands in the package CLAUDE.md files). If a touched line or branch is uncovered, the missing test is its own commit first and must pass against the old code; say so in the outline.
- Choose the outline path (rules in [outline.md](outline.md)): **mechanical**, **plan-conformant** (both defined in [outline.md](outline.md)), or full. Keep the results of this step for the `Preflight:` line.

## Outline

Use the format in [outline.md](outline.md), ending with the `Preflight:` line; short for mechanical and plan-conformant commits, full for everything else. The test table comes from [quality.md](quality.md).

## Build (in the background, right after the outline)

- **Start:** once the outline is sent, launch one background subagent (Agent tool, `run_in_background`, on your own model) that builds the outline with every recommendation applied. Give it the full outline, the settled choices and the rules of this section, plus a reading list: the files and line ranges from the outline's `Preflight: siblings read` item, the helpers to reuse, and the doc section the commit line names. It reads only that list, plus files its own edits touch, because the main session already did the searching. It edits the working tree.
- **While it runs:** the owner reviews the outline; checklist item 5 applies.
- **If the owner approves:** read the subagent's result, then hand off ([handoff.md](handoff.md)).
- **If the owner objects or answers a question differently:** discuss first, then change the code to match the revised outline (send the change to the same subagent, or edit it yourself once it finishes). If the commit changes direction, revert its edits before rebuilding.
- Build exactly what the outline says. If something comes up that would change design or behaviour (a deviation from the commit line, a decision row or the contract), the subagent stops and reports it; ask the owner then, and the outline's approval does not cover it.
- **Re-plan trigger.** Stop and invoke `plan-create-implementation` (tell the owner why) when the change needs more than 1.5 times the files the line named, a question that blocks the split appears, or the commit needs something no earlier commit provides. Record it in the doc's *Changes* log.
- **Tests first** for any change of behaviour: write the tests of the approved table, run them against the untouched code and confirm each fails for the right reason (one line per test in the hand-off), then implement until they pass. Exempt commits (see *Exemptions*) check coverage instead.
- In the same change, update the design doc: tick the item and collapse it to its one-line outcome (git holds the file list; drop its sub-bullets); mark the following item **Next** with enough detail to start on it; add a decision row for anything decided (the approved text, or propose it in chat first if it came up during implementation); when the commit is the last of its milestone, delete the step's *(temporary)* design notes (lasting choices are already decision rows) and add the milestone's three-line *Retro* ([handoff.md](handoff.md)).
- Tests must be green before the cleanup passes. The passes run in this order, so structural fixes land before the passes that check the final code:
  1. Run the `newcomer-reader` subagent: give it the output of `git status --short` for the touched files and one sentence on what the commit lets the app do, nothing else. It reports where a newcomer could not read, find or understand the change. Fix what it finds, and keep its report unchanged, with a decision for each finding (fixed, or rejected with the reason), for the hand-off.
  2. Use a subagent to run `/simplify` (skill `simplify`) on the change, on Sonnet at low effort (the Agent tool's `model` and `effort` options), telling it to read [.claude/rules/code.md](../../rules/code.md) first, check the change against it and CLAUDE.md *Conventions*, and fix what breaks them (style, apply without asking).
  3. Review the diff in subagents: `/security-review` for commits in a high-risk area ([../_shared/project.md](../_shared/project.md)), on Opus at high effort; and for commits that change the contract or the database schema, run the review on a different model from yours (the Agent tool's `model` option: Opus when you are Sonnet, Sonnet at high effort when you are Opus), because the model that wrote the code shares its blind spots. Fix what they find.
- Any cleanup, fix or deviation that would change design or behaviour follows CLAUDE.md *When to stop and ask*.

## Verify

- Run `yarn --cwd <package> check:changed` (type check, lint on the changed files, related unit tests, knip for unused exports) for each package you touched, in one message. Re-run after `/simplify`.
- Check the list in [../_shared/definition-of-done.md](../_shared/definition-of-done.md), then the structure checks and failure handling in [quality.md](quality.md).

## Hand off

Read [handoff.md](handoff.md) again now, in full, before writing a word of the hand-off, then follow it and run its *Check before sending* list. Then stop.
