---
name: next-commit
description: Outline the next commit from a design doc's Status, wait for the owner's reply, then implement, verify and update the doc. Use when the owner says "next", "next commit", or names a status item to work on.
disable-model-invocation: false
model: sonnet
effort: medium
argument-hint: "[module: the name of a docs/<module>.md] [task]"
arguments: [module]
---

# Next commit

Module: `$module` — the name of a `docs/<module>.md` that has a Status section. Anything typed after it is a free-text task: `$ARGUMENTS`. Both are optional; with no module, the **Next** items of all docs are listed (step 1). Follow CLAUDE.md's working agreements (especially *When to stop and ask* and *Writing*) throughout; this skill is only the order of work.

## Checklist

Every item below happens, in this order.

**Exemptions:** only pure moves, renames and doc-only commits skip items 4 and 5 (the tests-first step and `/simplify`) and the reviews in section 3. A commit's size is never an exemption.

1. Read [outline.md](outline.md), [quality.md](quality.md) and [handoff.md](handoff.md) now.
2. Run the size check, the coverage check (changes that alter no behaviour) and `git status --short` as real tool calls.
3. Send the outline as [outline.md](outline.md) says, end the turn, and wait for the owner's reply.
4. Write the tests first and show them failing.
5. Run `/simplify` in subagents.
6. Verify, then hand off as [handoff.md](handoff.md) says.

## 1. Find the work

- With a module, read only the Status of `docs/$module.md`. With none, run `grep -n Next docs/*.md`; if one doc has a **Next** item take it; otherwise ask through the picker (AskUserQuestion): one option per doc with a **Next** item (at most 4; drop prose matches that aren't status items), each labelled with the module and item number and described in one line, the most buildable one first and marked "(Recommended)". Take the item marked **Next**.
- Ask through the picker instead of guessing when: there is no **Next** item in the module (options: the other docs' **Next** items); or the free-text task contradicts the **Next** item (options: the **Next** item, the free-text task).
- If the **Next** item is a milestone not yet split into commits, invoke the `plan-create-implementation` skill (Skill tool, with `$module` as the argument) instead of stopping. Once it finishes, stop: its hand-off tells the owner what to review and when to `/clear` before `/next-commit`.
- Read the item's commit line (format: [../_shared/commit-line.md](../_shared/commit-line.md)): its Behaviours seed the test table, Settled lists the decisions already made, Done when is the verification. If the line lacks these, say so in the outline.
- Read what the item needs: the doc's sections about it, and the files it links.
- Look for existing patterns and helpers before outlining: read one sibling of each kind of file you'll add, and grep for an existing helper before planning a new one.
- Search for specific things; skip wide surveys. Read a sibling by line range when you only need a pattern. Never read generated files whole.
- Run the size check in [../_shared/commit-size.md](../_shared/commit-size.md) now that you have read the code. If it fails, stop as it says.
- Decide whether the commit is **mechanical** (rule in [outline.md](outline.md)); the line's *(mechanical)* flag is only a hint. For a change that alters no behaviour, run `test:coverage` on the files you'll touch (commands in the package CLAUDE.md files). If a touched line or branch is uncovered, the missing test is its own commit first and must pass against the old code; say so in the outline.
- Run `git status --short`. Leave uncommitted changes from other work alone. If they overlap files you'll touch, stop and ask: hunks can't be split.
- Choose the outline path (rules in [outline.md](outline.md)): **mechanical**, **plan-conformant** (both defined in [outline.md](outline.md)), or full. Keep the results of this step for the `Preflight:` line; its `git` field is the raw `git status --short` output.

## 2. Outline

Use the format in [outline.md](outline.md): start with the `Preflight:` line; short for mechanical and plan-conformant commits, full for everything else. The test table comes from [quality.md](quality.md).

## 3. Implement, after approval

- Build exactly what was approved. If something comes up that would change design or behaviour (a deviation from the commit line, a decision row or the contract), stop and ask.
- **Re-plan trigger.** Stop and invoke `plan-create-implementation` (tell the owner why) when the change needs more than 1.5 times the files the line named, a question that blocks the split appears, or the commit needs something no earlier commit provides. Record it in the doc's *Changes* log.
- **Tests first** for any change of behaviour: write the tests of the approved table, run them against the untouched code and confirm each fails for the right reason (one line per test in the hand-off), then implement until they pass. Pure moves, renames, refactors and doc-only changes check coverage instead.
- In the same change, update the design doc: tick the item and collapse it to its one-line outcome (git holds the file list; drop its sub-bullets); mark the following item **Next** with enough detail to start on it; add a decision row for anything decided (the approved text, or propose it in chat first if it came up during implementation); when a whole step is done, cut its design notes down to decision rows.
- Tests must be green before the cleanup pass. Then use a subagent to run `/simplify` (skill `simplify`) on the change, on Sonnet at low effort (the Agent tool's `model` and `effort` options), telling it to check the change against CLAUDE.md's code rules and fix what breaks them (style, apply without asking). If a cleanup would change design or behaviour, ask first.
- Then review the diff in subagents: `/security-review` for commits in a high-risk area ([../_shared/project.md](../_shared/project.md)), on Opus at high effort; and for commits that change the contract or the database schema, run the review on a different model from yours (the Agent tool's `model` option: Opus when you are Sonnet, Sonnet at high effort when you are Opus), because the model that wrote the code shares its blind spots. Fix what they find; if a fix would change design or behaviour, ask first.
- A hook formats edited files; don't run prettier yourself.

## 4. Verify

- Run lint, the type check and the relevant tests in parallel in one message; use single-file specs for the code you touched where the package CLAUDE.md allows. Re-run after `/simplify`.
- Check the list in [../_shared/definition-of-done.md](../_shared/definition-of-done.md), then the structure checks and failure handling in [quality.md](quality.md).

## 5. Hand off

Follow [handoff.md](handoff.md), then stop.
