---
name: next-commit
description: Outline the next commit from a design doc's Status, wait for approval (unless the commit is mechanical), then implement, verify and update the doc. Use when the owner says "next", "next commit", or names a status item to work on.
disable-model-invocation: false
argument-hint: "[module: the name of a docs/<module>.md] [task]"
arguments: [module]
---

# Next commit

Module: `$module` — the name of a `docs/<module>.md` that has a Status section. Anything typed after it is a free-text task: `$ARGUMENTS`. Both are optional; with no module, reuse the one saved in memory (step 1). Follow CLAUDE.md's working agreements (especially *When to stop and ask* and *Writing*) throughout; this skill is only the order of work.

## 1. Find the work

- Module memory: [../_shared/module-memory.md](../_shared/module-memory.md).
- With a module, read only the Status of `docs/$module.md`. With none and no memory file, run `grep -n Next docs/*.md` and read the Status of the matches. Take the item marked **Next**.
- Ask instead of guessing when: there is no **Next** item in the remembered module; there are several (list them with one-line summaries, offer the remembered module's as the default); or the free-text task contradicts the **Next** item (show both).
- If the **Next** item is a milestone not yet split into commits, invoke the `plan-create-implementation` skill (Skill tool, with `$module` as the argument) instead of stopping. Once it finishes, stop: its hand-off tells the owner what to review and when to `/clear` before `/next-commit`.
- Read the item's commit line (format: [../_shared/commit-line.md](../_shared/commit-line.md)): its Behaviours seed the test table, Settled lists the decisions already made, Done when is the verification. If the line lacks these, say so in the outline.
- Read what the item needs: the doc's sections about it, and the files it links.
- Look for existing patterns and helpers before outlining: read one sibling of each kind of file you'll add, and grep for an existing helper before planning a new one.
- Search for specific things; skip wide surveys. Read a sibling by line range when you only need a pattern. Never read generated files whole.
- Run the size check in [../_shared/commit-size.md](../_shared/commit-size.md) now that you have read the code. If it fails, stop as it says.
- Decide whether the commit is **mechanical** (rule in [outline.md](outline.md)); the line's *(mechanical)* flag is only a hint. For a change that alters no behaviour, run `test:coverage` on the files you'll touch (commands in the package CLAUDE.md files). If a touched line or branch is uncovered, the missing test is its own commit first and must pass against the old code; say so in the outline. Skip for pure moves, renames and doc-only commits.
- Run `git status --short`. Leave uncommitted changes from other work alone. If they overlap files you'll touch, stop and ask: hunks can't be split.

## 2. Outline

Use the format in [outline.md](outline.md): short and no wait for mechanical commits, full outline and wait for everything else. The test table comes from [quality.md](quality.md).

## 3. Implement, after approval

- Build exactly what was approved. If something comes up that would change design or behaviour, stop and ask.
- In the same change, update the design doc: tick the item; mark the following item **Next** with enough detail to start on it; add a decision row for anything decided (the approved text, or propose it in chat first if it came up during implementation); when a whole step is done, cut its design notes down to decision rows.
- Tests must be green before the cleanup pass. Then use a subagent to run `/simplify` (skill `simplify`) on the change, telling it to check the change against CLAUDE.md's code rules and fix what breaks them (style, apply without asking). If a cleanup would change design or behaviour, ask first. Skip for pure moves, renames and doc-only changes.
- A hook formats edited files; don't run prettier yourself.

## 4. Verify

- Run lint, the type check and the relevant tests in parallel in one message; use single-file specs for the code you touched where the package CLAUDE.md allows. Re-run after `/simplify`.
- Do the structure checks and failure handling in [quality.md](quality.md).

## 5. Hand off

Follow [handoff.md](handoff.md), then stop.
