# Outline formats

Used in step 2 of [SKILL.md](SKILL.md). The writing rules are in CLAUDE.md (*Writing*), the diagram, flow and link formats in [../_shared/output-format.md](../_shared/output-format.md); follow them here. Every section of an outline follows the *Bullets, not blocks* rule: sub-bullets for joined steps, never a paragraph.

**Every outline, short or full, ends the turn: no tool calls after it in the same message. Wait for the owner's reply; a note saying "my pick" is not approval.**

## Opening (every outline, short or full)

Start with a plain-language heading sentence saying what the commit does (for example "Send queued emails automatically"), then three lines. Use no function, file or type names in them; a reader who has not seen the code must follow them.

- **Today:** what the app does, or fails to do, right now.
- **After this commit:** what changes for the admin, customer or developer.
- **Why this way:** what would go wrong with the obvious alternative, or without this change.

Code names appear only from *What* onward. If *Why this way* needs type-system terms to make sense, stop and reconsider the design before defending it.

## Mechanical path

A commit is **mechanical** if it changes no logic lines, or existing tests already pin every touched line (the coverage check in step 1). Typical cases: file moves, renames, splits of a file with the same content, doc-only changes, lint-rule fixes that change no behaviour.

It is also eligible if it is **plan-conformant**: all three hold. The plan line has no open question (any user-visible text, error code or error shape the line leaves unstated counts as one); nothing read in step 1 deviates from the line; no decision row will be added. A plan-conformant commit may contain logic.

Give a **short outline** of about 5 lines after the opening.
- It has: the files (with the per-folder BEFORE/AFTER diagram for moves); the check that proves nothing changed (type check, test count before and after); the doc tick; the file count; the *Preflight* line.
- For a plan-conformant commit with logic, add the flow diagram ([../_shared/flow-diagram.md](../_shared/flow-diagram.md)) and the test table.
- Leave out *Terms*, *Trade-offs*, *Questions* and *Tests* unless one applies.
- Use the full outline, and wait, if the commit has new logic that is not plan-conformant, a changed lint rule, a new decision row, a question for the owner, or code the tests don't pin.
- If a commit labelled mechanical or plan-conformant turns out to change behaviour or design while you work, stop and give the full outline. The hand-off lists any deviation.

## Full outline

Write no code before approval. In plan mode, present it with ExitPlanMode. If the owner asks a question while in plan mode, answer it in chat and do not call ExitPlanMode until they say to proceed.

After the opening:

- **Terms:** define every specialized term the outline uses: what it means here, why use it, the alternatives. Never reuse a domain word (start, schedule, price, status) for something else; a new term is defined where it first appears.
- **What:** each file to add or change, as a table of links and what changes in it, and the total file count. For each new function longer than about 15 lines, list the small named functions it will be composed of, so the split is reviewed before any code exists. Name the existing helpers you will reuse. For moves, splits and renames, include the per-folder diagrams.
- **Shared with the sibling:** for a commit that adds files beside a sibling (create and edit, two pages), list what is reused from it and what is copied. A copy needs a reason it cannot be shared; if there is none, extract the shared piece in this commit and list it under *What*.
- **Flow:** for a commit with logic, the diagram in [../_shared/flow-diagram.md](../_shared/flow-diagram.md), so the owner approves the behaviour and not only the files.
- **Trade-offs:** only alternatives that were strong contenders, one bullet each: what it would give, what it would cost, why you didn't pick it. If no alternative is strong, write "none worth listing"; never add a weak one to fill the section.
- **Questions:** any design or behaviour change not already decided in the doc, each with your recommendation.
- **Tests:** a table, one row per behaviour (see [quality.md](quality.md)), and which of them will be written first and shown failing. For a refactor, the coverage result instead.
- **Doc update:** what changes in `docs/<area>.md`. Write out the exact text of any new decision row.
- **Preflight (last line):** `Preflight: size <n files, ok> | coverage <result, or n/a> | git <the raw `git status --short` output, or `clean` only when the command printed nothing> | siblings read <files> | library API <docs link, only for an API the repo doesn't use yet>`. A missing item is a check that was skipped. The short outline ends with it too.

If the owner replies with questions or objections, discuss them first: answer, recommend, ask follow-ups. Don't edit the outline or write code while the discussion is open. Once they agree, present the updated outline and wait for the go-ahead again.

## Before you send (outline)

- It opens with Today / After this commit / Why this way, and those lines name no code.
- Every new noun is defined where it first appears; no domain word is reused for something else.
- Each "why" says what would go wrong without it, in plain words.
- Each bullet keeps its "because"; joined steps are sub-bullets.
- Each file is linked once, with a line number checked by grep.
- A commit with logic has the flow diagram; a move has the folder diagrams.
- It ends with the `Preflight:` line, and no tool call follows it.
