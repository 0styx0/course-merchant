# Outline formats

Used in step 2 of [SKILL.md](SKILL.md). Terms, the diagram format for file moves and the writing rules are in CLAUDE.md (*Writing*); follow them here. Every section of an outline is bullet points, one idea per bullet, never a paragraph.

## Mechanical path

A commit is **mechanical** only if it changes no logic lines, or existing tests already pin every touched line (the coverage check in step 1). Typical cases: file moves, renames, splits of a file with the same content, doc-only changes, lint-rule fixes that change no behaviour.

Give a **short outline** of about 5 lines, then go straight to step 3. The short outline counts as approved.
- It has: the heading sentence; the files as links (with the per-folder BEFORE/AFTER diagram for moves); the check that proves nothing changed (type check, test count before and after); the doc tick; the file count.
- Leave out *Terms*, *Trade-offs*, *Config*, *Questions* and *Tests* unless one applies.
- Use the full outline, and wait, if the commit has new logic, a changed lint rule, a new decision row, a question for the owner, or code the tests don't pin.
- If a commit labelled mechanical turns out to change behaviour or design while you work, stop and give the full outline.

## Full outline

Give the outline and wait for the go-ahead. Write no code before approval. In plan mode, present it with ExitPlanMode. If the owner asks a question while in plan mode, answer it in chat and do not call ExitPlanMode until they say to proceed.

- **Heading:** a plain-language sentence saying what the commit does (for example "Send queued emails automatically"), not a class or file name.
- **Terms:** define every specialized term the outline uses: what it means here, why use it, the alternatives.
- **What:** each file to add or change, as links, with what changes in it, and the total file count. For each new function longer than about 15 lines, list the small named functions it will be composed of, so the split is reviewed before any code exists. Name the existing helpers you will reuse. For moves, splits and renames, include the per-folder diagrams.
- **Why:** the reason this is the next step, and how it fits the design doc.
- **Trade-offs:** only alternatives that were strong contenders, one bullet each: what it would give, what it would cost, why you didn't pick it. If no alternative is strong, write "none worth listing"; never add a weak one to fill the section.
- **Config:** keep module-specific settings inside that module, not in global config. If that would add real complexity, say so first.
- **Questions:** any design or behaviour change not already decided in the doc, each with your recommendation.
- **Tests:** a table, one row per behaviour (see [quality.md](quality.md)). For a refactor, the coverage result instead.
- **Doc update:** what changes in `docs/<area>.md`. Write out the exact text of any new decision row.

If the owner replies with questions or objections, discuss them first: answer, recommend, ask follow-ups. Don't edit the outline or write code while the discussion is open. Once they agree, present the updated outline and wait for the go-ahead again.
