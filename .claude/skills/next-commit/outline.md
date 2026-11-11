# Outline formats

Used in the *Outline* section of [SKILL.md](SKILL.md). Follow CLAUDE.md *Writing*; the diagram, flow and link formats are in [../_shared/output-format.md](../_shared/output-format.md).

## Skeleton

```
<heading sentence: what the commit does>
Today: …
After this commit: …
Why this way: …
What (table of files, file count) · Flow · Trade-offs · Questions · Tests · Doc update   <- full outline only
Preflight: size … | coverage … | siblings read … | library API …
```

## Rules for every outline

- One tool call follows the outline: the one that starts the background build (SKILL.md *Build*).
- End the turn after that call and wait for the owner's reply.
- Treat a reply as approval only when it says go, approve, OK or build it and leaves no question open.
- Give each *Questions* item a recommendation, and let the build apply it.
- Ask any question without a recommendation, or with several equally good options, through the picker first (AskUserQuestion). The outline then holds only settled recommendations.

## Opening (every outline, short or full)

Start with a plain-language heading sentence saying what the commit does (for example "Send queued emails automatically"), then three lines. Name no function, file or type in them, so a reader who has not seen the code can follow.

- **Today:** what the app does, or fails to do, right now.
- **After this commit:** what changes for the admin, customer or developer.
- **Why this way:** what would go wrong with the obvious alternative, or without this change.

Code names appear only from *What* onward.

## Mechanical path

A commit is **mechanical** when both hold:
- it changes no behaviour;
- existing tests pin every logic line it touches (the coverage check in *Find the work*).

The *(mechanical)* flag on a commit line is the planner's guess; this check decides. Typical cases: file moves, renames, splits of a file with the same content, doc-only changes, lint-rule fixes that change no behaviour.

A commit is also eligible when it is **plan-conformant**: all four hold.
- The plan line has no open question. Any user-visible text, error code or error shape the line leaves unstated counts as one.
- Nothing read in *Find the work* deviates from the line.
- The commit adds no decision row.
- The commit adds no shared piece that the line's *New shared pieces* omits. If it does, use the full outline and list the piece under *Questions*.

A plan-conformant commit may contain logic.

Give a **short outline** of about 5 lines after the opening.
- It has the files (with the per-folder BEFORE/AFTER diagram for moves), the check that proves nothing changed (type check, test count before and after), the doc tick, the file count and the *Preflight* line.
- For a plan-conformant commit with logic, add the flow diagram ([../_shared/flow-diagram.md](../_shared/flow-diagram.md)) and the test table.
- Leave out *Terms*, *Trade-offs*, *Questions* and *Tests* unless one applies. Define a new term in the bullet where it first appears.
- Switch to the full outline, and wait, when the commit has any of these: new logic that is not plan-conformant, a changed lint rule, a new decision row, a question for the owner, code the tests don't pin.
- Stop and give the full outline when a commit labelled mechanical or plan-conformant turns out to change behaviour or design while you work. The hand-off lists any deviation.

## Full outline

The build writes the code in the background right after you send the outline, and the owner sees none of it before approving. In plan mode, present the outline with ExitPlanMode.

After the opening, write these sections in order:

- **Terms:** define every specialized term the outline uses (CLAUDE.md *Writing*).
- **What:** each file to add or change, as a table of links | changes, with a few words per cell, and the total file count.
  - Put `(new)` after the link of a new file, in the file cell.
  - For each new function longer than about 15 lines, list the small named functions that will compose it, so the owner reviews the split before any code exists.
  - Name the existing helpers you will reuse. This is the only list of reused pieces; the flow diagram refers to it.
  - For moves, splits and renames, include the per-folder diagrams.
- **Differences from *New shared pieces*:** compare the commit line's *New shared pieces* with what this commit reuses and copies beside a sibling (create and edit, two pages).
  - A copy needs a reason it cannot be shared.
  - A shared piece the line does not list goes under *Questions*.
- **Flow:** for a commit with logic, the diagram in [../_shared/flow-diagram.md](../_shared/flow-diagram.md), so the owner approves the behaviour and not only the files.
- **Trade-offs:** only strong contenders, one bullet each: what the option would give, what it would cost, why you did not pick it. When no alternative is strong, write "none worth listing" and add no weak one.
- **Questions:** any design or behaviour change the doc has not decided, each with your recommendation.
- **Tests:** a table with one row per behaviour (see [quality.md](quality.md)), and which tests you write first and show failing. For a refactor, give the coverage result instead.
- **Doc update:** what changes in `docs/<area>.md`, with the exact text of any new decision row.
- **Preflight (last line):** `Preflight: size <n files, ok> | coverage <result, or n/a> | siblings read <files> | library API <docs link, only for an API the repo doesn't use yet>`. A missing item means you skipped that check. The short outline ends with it too.

## When the owner replies

- Answer questions and objections first: answer, recommend, ask follow-ups.
- Keep the outline as sent while the discussion is open.
- Once they agree, present the updated outline, adjust the background build to match (SKILL.md *Build*), and wait for the go-ahead again.
