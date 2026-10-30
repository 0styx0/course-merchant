# Hand-off format

Used in step 5 of [SKILL.md](SKILL.md). Keep it short, and write every summary as bullet points, one idea per bullet, never a paragraph:

- the files changed, as a table: links | high-level changes. Each link points at the first changed function in that file, as `[file.ts](path/file.ts#L42)`: the visible text is the file name only, with no line number, and the line is only in the link target (the line the function starts on; for a new file, its first function; the first modified line when nothing in it is a function, e.g. a doc or YAML). For moves, the same per-folder BEFORE/AFTER diagrams as in the outline);
- the verification result: when everything passes, a single line such as `Passed: lint, type check, unit, e2e`; detail a command only if it failed, with its output;
- a suggested conventional commit message, with no body unless it needs one, written as a copyable command (see CLAUDE.md *Writing*), e.g. `` `refactor(web): split the course form into sections` ``;
- the current context size, and a reminder to run `/clear` before the next commit.

Then stop. The owner makes the commit. If this finished a whole step in the Status, run `/usage-review`.

If the work is part of a sequence, give the command for the next item as a copyable command, e.g. `/next-commit <module-name>`.
