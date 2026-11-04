# Hand-off format

Used in the *Hand off* section of [SKILL.md](SKILL.md). Keep it short, and follow CLAUDE.md *Writing*. Diagram, flow and link formats are in [../_shared/output-format.md](../_shared/output-format.md). The items:

- Open with two plain lines that name no code: what the app can now do, and why the commit is shaped this way. The subagent or tool output you relay is restated in your own words.
- The files changed, as a table: links | high-level changes.
  - Each link points at the first changed function in that file, as `[file.ts](path/file.ts#L42)`.
  - The visible text is the file name only, with no line number. The line is only in the link target.
  - The line is where the function starts.
  - For a new file, use its first function.
  - When nothing in the file is a function (a doc or YAML), use the first modified line.
  - For moves, add the same per-folder BEFORE/AFTER diagrams as in the outline.
- The flow diagram as built ([../_shared/flow-diagram.md](../_shared/flow-diagram.md)), for commits with logic. Mark steps that differ from the outline `CHANGED`, with the reason (the same reason the *Deviations* line gives).
- The verification result.
  - When everything passes, a single line such as `Passed: lint, type check, unit, e2e`.
  - Detail a command only if it failed, with its output.
  - For API commits, also `Ran it: <what you did and saw>`. For UI commits, `Ran it: <the states walked in Chrome, what you saw>` and the GIF file name.
- `Tests:` the overview first, then the list of tests added or modified.
  - The overview lists: the counts, one line per test written first and why it failed, and any test that passed on the old code.
  - The list is a table in the same format as the files-changed table: links | high-level changes.
    - One row per test file, with the link on the first added or modified test, as `[file.test.tsx](path/file.test.tsx#L42)`.
    - The changes column names each test added or modified in that file, in plain words, and says which are new and which were changed.
    - Fixtures, mocks and other test helpers go in the files-changed table, not here.
- `Deviations from the plan line: none`, or what differed and why (a file, a behaviour, a decision made on the way).
- `Reviews:` which of the newcomer-reader pass, the `/simplify` pass, `/security-review` and the other-model review (SKILL.md *Build*) ran, in that order.
  - Give each finding as fixed or rejected, with a reason.
  - List every newcomer-reader finding as the agent worded it, never a summary.
- When this is the last commit of its milestone, a `Retro:` as defined in [../_shared/milestone-line.md](../_shared/milestone-line.md), also added to the milestone's `## Step N.` section.
- A suggested conventional commit message.
  - No body unless it needs one.
  - Written as a copyable command (see CLAUDE.md *Writing*), e.g. `` `refactor(web): split the course form into sections` ``.
- After a rename or move, the result of grepping for the old name in file names and code.
- A reminder to run `/clear` before the next commit.

Then stop. The owner makes the commit.

If the work is part of a sequence, give the command for the next item as a copyable command, e.g. `/next-commit <module-name>`.
