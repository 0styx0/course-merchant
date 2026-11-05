# Outline formats

Used in the *Outline* section of [SKILL.md](SKILL.md). The writing rules are in CLAUDE.md (*Writing*), the diagram, flow and link formats in [../_shared/output-format.md](../_shared/output-format.md); follow them here.

**Every outline, short or full, is followed by exactly one tool call: the one that starts the background build (SKILL.md *Build*). Then end the turn and wait for the owner's reply. Approval is a reply that says go, approve, OK or build it and leaves no question open.**

**Before sending:** each *Questions* item needs a recommendation, and the build applies it. Ask any question without a recommendation, or with several equally good options, through the picker first (AskUserQuestion), so the outline holds only settled recommendations.

## Opening (every outline, short or full)

Start with a plain-language heading sentence saying what the commit does (for example "Send queued emails automatically"), then three lines. Use no function, file or type names in them; a reader who has not seen the code must follow them.

- **Today:** what the app does, or fails to do, right now.
- **After this commit:** what changes for the admin, customer or developer.
- **Why this way:** what would go wrong with the obvious alternative, or without this change.

Code names appear only from *What* onward.
## Mechanical path

A commit is **mechanical** when it changes no behaviour **and** existing tests pin every logic line it touches (the coverage check in *Find the work*). The *(mechanical)* flag on a commit line is the planner's guess; this check decides. Typical cases: file moves, renames, splits of a file with the same content, doc-only changes, lint-rule fixes that change no behaviour.

It is also eligible if it is **plan-conformant**: all four hold. The plan line has no open question (any user-visible text, error code or error shape the line leaves unstated counts as one); nothing read in *Find the work* deviates from the line; no decision row will be added; the commit adds no shared piece the line's *New shared pieces* omits (if it does, use the full outline and list the piece under *Questions*). A plan-conformant commit may contain logic.

Give a **short outline** of about 5 lines after the opening.
- It has: the files (with the per-folder BEFORE/AFTER diagram for moves); the check that proves nothing changed (type check, test count before and after); the doc tick; the file count; the *Preflight* line.
- For a plan-conformant commit with logic, add the flow diagram ([../_shared/flow-diagram.md](../_shared/flow-diagram.md)) and the test table.
- Leave out *Terms*, *Trade-offs*, *Questions* and *Tests* unless one applies.
- Use the full outline, and wait, if the commit has new logic that is not plan-conformant, a changed lint rule, a new decision row, a question for the owner, or code the tests don't pin.
- If a commit labelled mechanical or plan-conformant turns out to change behaviour or design while you work, stop and give the full outline. The hand-off lists any deviation.

## Full outline

The code is written in the background right after the outline is sent, but the owner sees none of it before approving. In plan mode, present it with ExitPlanMode.
After the opening:

- **Terms:** define every specialized term the outline uses: what it means here, why use it, the alternatives. Never reuse a domain word (start, schedule, price, status) for something else; a new term is defined where it first appears.
- **What:** each file to add or change, as a table of links and what changes in it (a new file gets `(new)` after its link in the file cell, never in the changes cell), and the total file count. For each new function longer than about 15 lines, list the small named functions it will be composed of, so the split is reviewed before any code exists. Name the existing helpers you will reuse. For moves, splits and renames, include the per-folder diagrams.
- **Differences from *New shared pieces*:** compare the commit line's *New shared pieces* with what this commit reuses and copies beside a sibling (create and edit, two pages). A copy needs a reason it cannot be shared. A shared piece the line does not list goes under *Questions*.
- **Flow:** for a commit with logic, the diagram in [../_shared/flow-diagram.md](../_shared/flow-diagram.md), so the owner approves the behaviour and not only the files.
- **Trade-offs:** only alternatives that were strong contenders, one bullet each: what it would give, what it would cost, why you didn't pick it. If no alternative is strong, write "none worth listing"; never add a weak one to fill the section.
- **Questions:** any design or behaviour change not already decided in the doc, each with your recommendation.
- **Tests:** a table, one row per behaviour (see [quality.md](quality.md)), and which of them will be written first and shown failing. For a refactor, the coverage result instead.
- **Doc update:** what changes in `docs/<area>.md`. Write out the exact text of any new decision row.
- **Preflight (last line):** `Preflight: size <n files, ok> | coverage <result, or n/a> | siblings read <files> | library API <docs link, only for an API the repo doesn't use yet>`. A missing item is a check that was skipped. The short outline ends with it too.

If the owner replies with questions or objections, discuss them first: answer, recommend, ask follow-ups. Keep the outline as sent while the discussion is open. Once they agree, present the updated outline, adjust the background build to match (SKILL.md *Build*), and wait for the go-ahead again.
