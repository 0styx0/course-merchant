# Hand-off format

Used in the *Hand off* section of [SKILL.md](SKILL.md). Follow CLAUDE.md *Writing*. Diagram, flow and link formats are in [../_shared/output-format.md](../_shared/output-format.md).

The first four items fit on one screen, so the owner sees what needs a decision before the detail.

## Skeleton

```
<two plain lines: what the app can now do, why the commit has this shape>
Deviations from the plan line: none
Passed: lint, type check, unit, integration, e2e
`feat(scope): subject`

Files changed (table) · Parts as built · Flow as built · Ran it · Tests · Reviews · Retro · Rename grep · /clear reminder
```

## The top four

1. **Opening:** two plain lines that name no code: what the app can now do, and why the commit has this shape.
2. **Deviations:** `Deviations from the plan line: none`, or what differed and why (a file, a behaviour, a decision made on the way).
3. **Verification:** list every test type the commit ran.
   - When everything passes, write one line such as `Passed: lint, type check, unit, integration, e2e`.
   - Put a failed command first, with its output.
   - A skipped test type needs the owner's exact words "I AUTHORIZE YOU TO SKIP WRITING TESTS THIS TIME", quoted.
4. **Commit message:** one conventional commit message on its own line, as CLAUDE.md *Copyable commands* says. Add a body only when it needs one.

## The details

Write these after the top four, in this order.

- **Files changed:** a table of links | changes, with a few words per cell.
  - Link each file at the line where its first changed function starts, as `[file.ts](path/file.ts#L42)`. Use the first modified line when the file has no function (a doc or YAML).
  - Show the file name only as link text. Put `(new)` after the link in the file cell.
  - For moves, add the same per-folder BEFORE/AFTER diagrams as in the outline.
- **Parts as built** ([../_shared/parts-diagram.md](../_shared/parts-diagram.md)), for commits that add or change code. Mark each part that differs from the outline `CHANGED`, with the reason the *Deviations* line gives.
- **Flow as built** ([../_shared/flow-diagram.md](../_shared/flow-diagram.md)), for commits with logic. Mark each step that differs from the outline `CHANGED`, with the reason the *Deviations* line gives.
- **Ran it:** for API commits, `Ran it: <what you did and saw>`. For UI commits, `Ran it: <the states walked in Chrome, what you saw>` and the GIF file name.
- **Tests:** three parts.
  - The overview: the counts, one line per test written first and why it failed, and any test that passed on the old code.
  - A table of links | changes with one row per test file.
    - Link the first added or modified test, as `[file.test.tsx](path/file.test.tsx#L42)`, and put `(new)` after the link of a new file.
    - Name each test added or modified in plain words and say whether it is new or changed.
    - Put fixtures, mocks and other test helpers in the files-changed table.
  - The coverage map: the approved test table ([quality.md](quality.md) *Test table*) with each cell filled by `test title ([file.test.tsx](path/file.test.tsx#L42))`.
    - Keep the rows and columns of the table, so the owner compares it with the outline cell by cell.
    - Write `NOT TESTED: <reason>` in a cell with no test, so a gap shows on sight.
    - Leave a cell empty only when the outline left it empty, and repeat the outline's reason.
- **Reviews:** which of the newcomer-reader pass, the `/simplify` pass, `/security-review` and the other-model review (SKILL.md *Build*) ran, in that order.
  - Give each finding as fixed or rejected, with a reason.
  - Quote the newcomer-reader findings word for word, then add the decision in bold as a new bullet under each. This is the exception to CLAUDE.md *Relaying*. Give each *Also noticed* item a decision too.
- **Retro:** only for the last commit of a milestone, as [../_shared/milestone-line.md](../_shared/milestone-line.md) defines it. Add it to the milestone's `## Step N.` section too.
- **Rename grep:** after a rename or move, the result of grepping for the old name in file names and code.
- **Next step:** a reminder to run `/clear` before the next commit. When the work is part of a sequence, give the next command on its own line, e.g. `/next-commit <module-name>`.

Then stop. The owner makes the commit.
