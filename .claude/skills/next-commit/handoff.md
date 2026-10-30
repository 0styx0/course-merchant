# Hand-off format

Used in step 5 of [SKILL.md](SKILL.md). Keep it short, and write every summary as bullet points, one idea per bullet, never a paragraph:

- the files changed, as a table: links | high-level changes. Each link points at the first changed function in that file, as `[file.ts](path/file.ts#L42)`: the visible text is the file name only, with no line number, and the line is only in the link target (the line the function starts on; for a new file, its first function; the first modified line when nothing in it is a function, e.g. a doc or YAML). For moves, the same per-folder BEFORE/AFTER diagrams as in the outline);
- the verification result: when everything passes, a single line such as `Passed: lint, type check, unit, e2e`; detail a command only if it failed, with its output; for UI and API commits also `Ran it: <what you did and saw>`;
- `Deviations from the plan line: none` or what differed and why (a file, a behaviour, a decision made on the way);
- `Reviews:` which of `/code-review` and `/security-review` ran, and each finding fixed or rejected with a reason;
- a suggested conventional commit message, with no body unless it needs one, written as a copyable command (see CLAUDE.md *Writing*), e.g. `` `refactor(web): split the course form into sections` ``;
- a reminder to run `/clear` before the next commit.

Then stop. The owner makes the commit.

If the work is part of a sequence, give the command for the next item as a copyable command, e.g. `/next-commit <module-name>`.
